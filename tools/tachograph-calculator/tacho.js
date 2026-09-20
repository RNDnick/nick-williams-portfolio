(function () {
  var STORAGE_KEY = 'nw-tacho-tracker-v1';

  var MAX_DRIVING_MS = 4.5 * 60 * 60 * 1000;
  var BREAK_FULL_MS = 45 * 60 * 1000;
  var BREAK_FIRST_PART_MS = 15 * 60 * 1000;
  var BREAK_SECOND_PART_MS = 30 * 60 * 1000;
  var DAILY_LIMIT_MS = 9 * 60 * 60 * 1000;
  var DAILY_EXTENDED_MS = 10 * 60 * 60 * 1000;

  var statusCard = document.getElementById('tacho-status-card');
  var stateLabel = document.getElementById('tacho-state-label');
  var mainValue = document.getElementById('tacho-main-value');
  var mainCaption = document.getElementById('tacho-main-caption');
  var subMessage = document.getElementById('tacho-sub-message');

  var startDrivingBtn = document.getElementById('start-driving-btn');
  var takeBreakBtn = document.getElementById('take-break-btn');
  var resumeDrivingBtn = document.getElementById('resume-driving-btn');
  var endShiftBtn = document.getElementById('end-shift-btn');

  var dailyValue = document.getElementById('tacho-daily-value');
  var dailyBarFill = document.getElementById('tacho-daily-bar-fill');
  var dailyNote = document.getElementById('tacho-daily-note');

  var logList = document.getElementById('tacho-log-list');
  var logEmpty = document.getElementById('tacho-log-empty');

  function loadSegments() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveSegments() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(segments)); } catch (e) {}
  }

  var segments = loadSegments();

  function currentSegment() {
    var last = segments[segments.length - 1];
    return (last && last.end === null) ? last : null;
  }

  function startDriving() {
    var cur = currentSegment();
    if (cur) cur.end = Date.now();
    segments.push({ type: 'driving', start: Date.now(), end: null });
    saveSegments();
    render();
  }

  function startBreak() {
    var cur = currentSegment();
    if (cur) cur.end = Date.now();
    segments.push({ type: 'break', start: Date.now(), end: null });
    saveSegments();
    render();
  }

  function endShift() {
    if (segments.length && !window.confirm('End this shift? This clears today’s log and resets the tracker.')) return;
    segments = [];
    saveSegments();
    render();
  }

  // Replays the segment log up to time t, returning cumulative driving
  // time since the last qualifying break, whether a split break's first
  // part is currently banked, total driving time logged, and which
  // segment (if any) is still open.
  function computeStatus(segs, t) {
    var drivingSinceReset = 0;
    var hasFirstPart = false;
    var totalDriving = 0;
    var openType = null;
    var openElapsed = 0;

    segs.forEach(function (seg) {
      var end = seg.end === null ? t : seg.end;
      var dur = Math.max(0, end - seg.start);

      if (seg.type === 'driving') {
        totalDriving += dur;
        drivingSinceReset += dur;
        if (seg.end === null) { openType = 'driving'; openElapsed = dur; }
      } else {
        if (seg.end === null) { openType = 'break'; openElapsed = dur; }
        if (dur >= BREAK_FULL_MS) {
          drivingSinceReset = 0;
          hasFirstPart = false;
        } else if (dur >= BREAK_SECOND_PART_MS && hasFirstPart) {
          drivingSinceReset = 0;
          hasFirstPart = false;
        } else if (dur >= BREAK_FIRST_PART_MS) {
          hasFirstPart = true;
        }
      }
    });

    return {
      drivingSinceReset: drivingSinceReset,
      hasFirstPart: hasFirstPart,
      totalDriving: totalDriving,
      openType: openType,
      openElapsed: openElapsed
    };
  }

  function formatCountdown(ms) {
    var neg = ms < 0;
    var abs = Math.abs(Math.round(ms / 1000)) * 1000;
    var totalSeconds = Math.floor(abs / 1000);
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return (neg ? '-' : '') + h + ':' + pad(m) + ':' + pad(s);
  }

  function formatShort(ms) {
    var totalMinutes = Math.floor(Math.max(0, ms) / 60000);
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    if (h === 0) return m + 'm';
    return h + 'h ' + m + 'm';
  }

  function formatClock(ts) {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function renderLog() {
    logList.textContent = '';
    var closed = segments.filter(function (s) { return s.end !== null; });
    if (closed.length === 0) {
      logEmpty.hidden = false;
      return;
    }
    logEmpty.hidden = true;
    closed.forEach(function (seg) {
      var li = document.createElement('li');

      var typeSpan = document.createElement('span');
      typeSpan.className = 'tacho-log-type ' + seg.type;
      typeSpan.textContent = seg.type === 'driving' ? 'Driving' : 'Break';

      var timeSpan = document.createElement('span');
      timeSpan.className = 'tacho-log-time';
      timeSpan.textContent = formatClock(seg.start) + '–' + formatClock(seg.end);

      var durSpan = document.createElement('span');
      durSpan.className = 'tacho-log-duration';
      durSpan.textContent = formatShort(seg.end - seg.start);

      li.appendChild(typeSpan);
      li.appendChild(timeSpan);
      li.appendChild(durSpan);
      logList.appendChild(li);
    });
  }

  function render() {
    var t = Date.now();
    var live = computeStatus(segments, t);

    // Baseline = state as it was just before the currently-open segment
    // started, used to message whether an in-progress break will
    // complete a split break or start a fresh first part.
    var closedOnly = live.openType ? segments.slice(0, -1) : segments;
    var baseline = computeStatus(closedOnly, t);

    var timeUntilBreak = MAX_DRIVING_MS - live.drivingSinceReset;

    statusCard.className = 'tacho-status-card';
    endShiftBtn.hidden = segments.length === 0;
    startDrivingBtn.hidden = true;
    takeBreakBtn.hidden = true;
    resumeDrivingBtn.hidden = true;
    subMessage.hidden = true;

    if (live.openType === 'driving') {
      var overdue = timeUntilBreak < 0;
      statusCard.classList.add(overdue ? 'state-overdue' : 'state-driving');
      stateLabel.textContent = overdue ? 'Break overdue' : 'Driving';
      mainValue.textContent = formatCountdown(timeUntilBreak);
      mainCaption.textContent = overdue
        ? 'over your 4.5-hour driving limit — take a break as soon as it’s safe to.'
        : 'until your next break is due.';
      takeBreakBtn.hidden = false;
    } else if (live.openType === 'break') {
      statusCard.classList.add('state-break');
      stateLabel.textContent = 'On break';
      mainValue.textContent = formatShort(live.openElapsed);
      mainCaption.textContent = 'break taken so far.';

      var elapsed = live.openElapsed;
      subMessage.hidden = false;
      if (elapsed >= BREAK_FULL_MS) {
        subMessage.textContent = 'This already qualifies as a full break — your driving clock will reset when you resume.';
      } else if (elapsed >= BREAK_SECOND_PART_MS && baseline.hasFirstPart) {
        subMessage.textContent = 'This completes your split break — your driving clock will reset when you resume.';
      } else if (elapsed >= BREAK_FIRST_PART_MS) {
        subMessage.textContent = 'This counts as the first part of a split break. You’ll still need a second break of at least 30 minutes before your next 4.5 hours of driving is up.';
      } else {
        subMessage.textContent = (Math.ceil((BREAK_FIRST_PART_MS - elapsed) / 60000)) + ' more minute(s) needed for this to count as the first part of a break (minimum 15 minutes).';
      }

      resumeDrivingBtn.hidden = false;
    } else {
      stateLabel.textContent = 'Not started';
      mainValue.textContent = formatCountdown(MAX_DRIVING_MS);
      mainCaption.textContent = 'Tap Start driving to begin tracking.';
      startDrivingBtn.hidden = false;
    }

    dailyValue.textContent = formatShort(live.totalDriving);
    var dailyPercent = Math.min(100, (live.totalDriving / DAILY_EXTENDED_MS) * 100);
    dailyBarFill.style.width = dailyPercent + '%';
    dailyBarFill.className = 'tacho-daily-bar-fill';
    if (live.totalDriving >= DAILY_EXTENDED_MS) {
      dailyBarFill.classList.add('bad');
      dailyNote.textContent = 'Over the maximum permitted daily driving time (10 hours).';
    } else if (live.totalDriving >= DAILY_LIMIT_MS) {
      dailyBarFill.classList.add('warn');
      dailyNote.textContent = 'Over the standard 9-hour limit — only permitted on up to two days a week (10 hours max).';
    } else {
      dailyNote.textContent = 'Standard daily limit is 9 hours, extendable to 10 hours up to twice a week.';
    }

    renderLog();
  }

  startDrivingBtn.addEventListener('click', startDriving);
  takeBreakBtn.addEventListener('click', startBreak);
  resumeDrivingBtn.addEventListener('click', startDriving);
  endShiftBtn.addEventListener('click', endShift);

  render();
  setInterval(render, 1000);
})();
