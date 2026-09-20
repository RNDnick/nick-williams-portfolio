(function () {
  var STORAGE_KEY = 'nw-wtd-tracker-v1';

  var statDays = document.getElementById('stat-days');
  var statThisWeek = document.getElementById('stat-this-week');
  var statAverage = document.getElementById('stat-average');
  var statAverageLabel = document.getElementById('stat-average-label');
  var statBreakShortfall = document.getElementById('stat-break-shortfall');
  var statNightBreach = document.getElementById('stat-night-breach');
  var statButtons = document.querySelectorAll('#wtd-stats .wtd-stat');

  var refPeriodSelect = document.getElementById('ref-period-select');
  var addDayBtn = document.getElementById('add-day-btn');
  var exportCsvBtn = document.getElementById('export-csv-btn');
  var exportBackupBtn = document.getElementById('export-backup-btn');
  var importBackupBtn = document.getElementById('import-backup-btn');
  var importFileInput = document.getElementById('import-file-input');

  var form = document.getElementById('wtd-form');
  var idInput = document.getElementById('entry-id');
  var dateInput = document.getElementById('entry-date');
  var startInput = document.getElementById('entry-start');
  var endInput = document.getElementById('entry-end');
  var breakInput = document.getElementById('entry-break');
  var notesInput = document.getElementById('entry-notes');
  var saveBtn = document.getElementById('save-entry-btn');
  var cancelBtn = document.getElementById('cancel-edit-btn');

  var tbody = document.getElementById('wtd-table-body');
  var emptyEl = document.getElementById('wtd-empty');
  var weeklyList = document.getElementById('wtd-weekly-list');
  var weeklyEmpty = document.getElementById('wtd-weekly-empty');

  var currentFilter = 'all';

  function toDateKey(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function generateExampleEntries() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    function offset(daysAgo) {
      var d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return toDateKey(d);
    }
    return [
      { id: 'example-1', date: offset(6), start: '08:00', end: '16:30', breakMinutes: 30, notes: '' },
      { id: 'example-2', date: offset(5), start: '06:00', end: '18:00', breakMinutes: 60, notes: '' },
      { id: 'example-3', date: offset(4), start: '22:00', end: '06:00', breakMinutes: 30, notes: 'Overnight run — within the night-work cap.' },
      { id: 'example-4', date: offset(2), start: '05:00', end: '15:00', breakMinutes: 45, notes: '' },
      { id: 'example-5', date: offset(1), start: '07:00', end: '19:30', breakMinutes: 30, notes: 'Delete me once you start logging your own days — this one’s short on its break.' },
      { id: 'example-6', date: offset(0), start: '18:00', end: '06:00', breakMinutes: 30, notes: 'Delete me — example of a night-work breach over 10 hours.' }
    ];
  }

  function loadData() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return { entries: [], refWeeks: 17 };
    }
    if (raw === null) return null;
    try {
      var parsed = JSON.parse(raw);
      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        refWeeks: parsed.refWeeks === 26 ? 26 : 17
      };
    } catch (e) {
      return { entries: [], refWeeks: 17 };
    }
  }

  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: entries, refWeeks: refWeeks })); } catch (e) {}
  }

  var loaded = loadData();
  var entries, refWeeks;
  if (loaded === null) {
    entries = generateExampleEntries();
    refWeeks = 17;
    saveData();
  } else {
    entries = loaded.entries;
    refWeeks = loaded.refWeeks;
  }
  refPeriodSelect.value = String(refWeeks);

  function newId() {
    return 'w-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function weekStartKey(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var day = d.getDay();
    var diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return toDateKey(d);
  }

  function formatDateDisplay(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatHours(h) {
    var rounded = Math.round(h * 10) / 10;
    return (rounded % 1 === 0) ? String(rounded) : String(rounded.toFixed(1));
  }

  function computeEntryDerived(entry) {
    var startDT = new Date(entry.date + 'T' + entry.start + ':00');
    var endDT = new Date(entry.date + 'T' + entry.end + ':00');
    if (endDT <= startDT) endDT.setDate(endDT.getDate() + 1);

    var spanMinutes = (endDT - startDT) / 60000;
    var breakMinutes = Number(entry.breakMinutes) || 0;
    var workingHours = Math.max(0, spanMinutes - breakMinutes) / 60;

    var breakRequiredMinutes = workingHours > 9 ? 45 : (workingHours > 6 ? 30 : 0);
    var breakOk = breakMinutes >= breakRequiredMinutes;

    var dayStart = new Date(entry.date + 'T00:00:00');
    var day04 = new Date(dayStart); day04.setHours(4, 0, 0, 0);
    var nextDayStart = new Date(dayStart); nextDayStart.setDate(nextDayStart.getDate() + 1);
    var nextDay04 = new Date(nextDayStart); nextDay04.setHours(4, 0, 0, 0);

    var overlapsToday = startDT < day04 && endDT > dayStart;
    var overlapsTomorrow = startDT < nextDay04 && endDT > nextDayStart;
    var isNightWork = overlapsToday || overlapsTomorrow;
    var nightBreach = isNightWork && workingHours > 10;

    return {
      workingHours: workingHours,
      breakRequiredMinutes: breakRequiredMinutes,
      breakOk: breakOk,
      isNightWork: isNightWork,
      nightBreach: nightBreach
    };
  }

  function computeWeeklyTotals() {
    var map = {};
    entries.forEach(function (e) {
      var wk = weekStartKey(e.date);
      map[wk] = (map[wk] || 0) + computeEntryDerived(e).workingHours;
    });
    return map;
  }

  function computeRollingAverage(weeklyMap) {
    var currentWeekStart = weekStartKey(toDateKey(new Date()));
    var d = new Date(currentWeekStart + 'T00:00:00');
    var sum = 0, count = 0;
    for (var i = 0; i < refWeeks; i++) {
      var wk = toDateKey(d);
      if (Object.prototype.hasOwnProperty.call(weeklyMap, wk)) {
        sum += weeklyMap[wk];
        count++;
      }
      d.setDate(d.getDate() - 7);
    }
    return { sum: sum, count: count, average: count > 0 ? sum / count : null };
  }

  function resetForm() {
    form.reset();
    idInput.value = '';
    saveBtn.textContent = 'Add day';
  }

  function openFormForAdd() {
    resetForm();
    dateInput.value = toDateKey(new Date());
    form.hidden = false;
    dateInput.focus();
  }

  function openFormForEdit(entry) {
    idInput.value = entry.id;
    dateInput.value = entry.date;
    startInput.value = entry.start;
    endInput.value = entry.end;
    breakInput.value = entry.breakMinutes;
    notesInput.value = entry.notes || '';
    saveBtn.textContent = 'Update day';
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function deleteEntry(id) {
    var entry = entries.filter(function (e) { return e.id === id; })[0];
    if (!entry) return;
    if (!window.confirm('Delete the entry for ' + formatDateDisplay(entry.date) + '? This can’t be undone.')) return;
    entries = entries.filter(function (e) { return e.id !== id; });
    saveData();
    render();
  }

  function renderStats() {
    var weeklyMap = computeWeeklyTotals();
    var thisWeekKey = weekStartKey(toDateKey(new Date()));
    var thisWeekHours = weeklyMap[thisWeekKey] || 0;
    var rolling = computeRollingAverage(weeklyMap);

    var breakShortfall = 0, nightBreach = 0;
    entries.forEach(function (e) {
      var d = computeEntryDerived(e);
      if (!d.breakOk) breakShortfall++;
      if (d.nightBreach) nightBreach++;
    });

    statDays.textContent = entries.length;

    statThisWeek.textContent = formatHours(thisWeekHours) + 'h';
    statThisWeek.className = 'wtd-stat-value' + (thisWeekHours > 48 ? ' bad-text' : '');

    if (rolling.count === 0) {
      statAverage.textContent = '—';
      statAverageLabel.textContent = refWeeks + '-week average';
    } else {
      statAverage.textContent = formatHours(rolling.average) + 'h';
      statAverageLabel.textContent = 'Avg (' + rolling.count + '/' + refWeeks + ' wks)';
    }
    statAverage.className = 'wtd-stat-value' + (rolling.average !== null && rolling.average > 48 ? ' bad-text' : '');

    statBreakShortfall.textContent = breakShortfall;
    statNightBreach.textContent = nightBreach;

    statButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
    });
  }

  function renderTable() {
    var sorted = entries.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var filtered = sorted.filter(function (e) {
      if (currentFilter === 'all') return true;
      var d = computeEntryDerived(e);
      if (currentFilter === 'breakShortfall') return !d.breakOk;
      if (currentFilter === 'nightBreach') return d.nightBreach;
      return true;
    });

    tbody.textContent = '';
    filtered.forEach(function (e) {
      var d = computeEntryDerived(e);
      var tr = document.createElement('tr');

      var tdDate = document.createElement('td');
      tdDate.className = 'wtd-date';
      tdDate.textContent = formatDateDisplay(e.date);

      var tdHours = document.createElement('td');
      tdHours.className = 'wtd-hours';
      tdHours.textContent = formatHours(d.workingHours) + 'h';

      var tdShift = document.createElement('td');
      tdShift.textContent = e.start + '–' + e.end;

      var tdBreak = document.createElement('td');
      var breakBadge = document.createElement('span');
      breakBadge.className = 'wtd-badge ' + (d.breakRequiredMinutes === 0 ? 'neutral' : (d.breakOk ? 'ok' : 'bad'));
      breakBadge.textContent = e.breakMinutes + 'm' + (d.breakRequiredMinutes > 0 ? ' / ' + d.breakRequiredMinutes + 'm req' : '');
      tdBreak.appendChild(breakBadge);

      var tdNight = document.createElement('td');
      if (d.isNightWork) {
        var nightBadge = document.createElement('span');
        nightBadge.className = 'wtd-badge ' + (d.nightBreach ? 'bad' : 'ok');
        nightBadge.textContent = d.nightBreach ? 'Over 10h limit' : 'Within 10h limit';
        tdNight.appendChild(nightBadge);
      } else {
        tdNight.textContent = '—';
      }

      var tdActions = document.createElement('td');
      var actionsRow = document.createElement('div');
      actionsRow.className = 'wtd-actions';
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'row-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function () { openFormForEdit(e); });
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'row-btn row-btn-danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', function () { deleteEntry(e.id); });
      actionsRow.appendChild(editBtn);
      actionsRow.appendChild(delBtn);
      tdActions.appendChild(actionsRow);

      tr.appendChild(tdDate);
      tr.appendChild(tdHours);
      tr.appendChild(tdShift);
      tr.appendChild(tdBreak);
      tr.appendChild(tdNight);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });

    if (filtered.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = entries.length === 0
        ? 'No days logged yet — add your first one above.'
        : 'No days match this filter.';
    } else {
      emptyEl.hidden = true;
    }
  }

  function renderWeekly() {
    var weeklyMap = computeWeeklyTotals();
    var keys = Object.keys(weeklyMap).sort().reverse();
    weeklyList.textContent = '';
    if (keys.length === 0) {
      weeklyEmpty.hidden = false;
      return;
    }
    weeklyEmpty.hidden = true;
    keys.forEach(function (wk) {
      var hours = weeklyMap[wk];
      var li = document.createElement('li');
      var label = document.createElement('span');
      label.className = 'wtd-weekly-label';
      label.textContent = 'Week starting ' + formatDateDisplay(wk);
      var hoursSpan = document.createElement('span');
      hoursSpan.className = 'wtd-weekly-hours ' + (hours > 48 ? 'bad' : 'ok');
      hoursSpan.textContent = formatHours(hours) + 'h / 48h';
      li.appendChild(label);
      li.appendChild(hoursSpan);
      weeklyList.appendChild(li);
    });
  }

  function render() {
    renderStats();
    renderTable();
    renderWeekly();
  }

  function setFilter(filter) {
    currentFilter = (currentFilter === filter) ? 'all' : filter;
    render();
  }

  function downloadFile(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function csvEscape(value) {
    var str = String(value === null || value === undefined ? '' : value);
    if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
    return str;
  }

  function exportCsv() {
    var headers = ['Date', 'Start', 'End', 'Working hours', 'Break taken (min)', 'Break required (min)', 'Night work', 'Notes'];
    var lines = [headers.join(',')];
    entries.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (e) {
      var d = computeEntryDerived(e);
      lines.push([
        e.date, e.start, e.end, formatHours(d.workingHours), e.breakMinutes, d.breakRequiredMinutes,
        d.isNightWork ? (d.nightBreach ? 'Yes — over 10h limit' : 'Yes') : 'No',
        e.notes
      ].map(csvEscape).join(','));
    });
    downloadFile(lines.join('\n') + '\n', 'wtd-export.csv', 'text/csv');
  }

  function exportBackup() {
    downloadFile(JSON.stringify({ entries: entries, refWeeks: refWeeks }, null, 2), 'wtd-backup.json', 'application/json');
  }

  function sanitiseImported(parsed) {
    var arr = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.entries) ? parsed.entries : null);
    if (!arr) return null;
    return arr
      .filter(function (x) { return x && typeof x === 'object' && typeof x.date === 'string' && typeof x.start === 'string' && typeof x.end === 'string'; })
      .map(function (x) {
        return {
          id: typeof x.id === 'string' && x.id ? x.id : newId(),
          date: x.date,
          start: x.start,
          end: x.end,
          breakMinutes: typeof x.breakMinutes === 'number' ? x.breakMinutes : (Number(x.breakMinutes) || 0),
          notes: typeof x.notes === 'string' ? x.notes : ''
        };
      });
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsedRaw, cleaned;
      try {
        parsedRaw = JSON.parse(String(reader.result));
        cleaned = sanitiseImported(parsedRaw);
        if (!cleaned) throw new Error('unexpected shape');
      } catch (e) {
        window.alert('Couldn’t read that file as a backup — make sure it’s a JSON file exported from this tool.');
        return;
      }
      if (!cleaned.length) {
        window.alert('That file doesn’t contain any valid days.');
        return;
      }
      var ok = window.confirm('Import ' + cleaned.length + ' day(s)? This will replace the ' + entries.length + ' currently stored in this browser.');
      if (!ok) return;
      entries = cleaned;
      if (parsedRaw && !Array.isArray(parsedRaw) && (parsedRaw.refWeeks === 17 || parsedRaw.refWeeks === 26)) {
        refWeeks = parsedRaw.refWeeks;
        refPeriodSelect.value = String(refWeeks);
      }
      saveData();
      render();
    };
    reader.readAsText(file);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var date = dateInput.value;
    var start = startInput.value;
    var end = endInput.value;
    if (!date || !start || !end) return;

    var id = idInput.value;
    var data = {
      id: id || newId(),
      date: date,
      start: start,
      end: end,
      breakMinutes: Math.max(0, Number(breakInput.value) || 0),
      notes: notesInput.value.trim()
    };

    if (id) {
      entries = entries.map(function (x) { return x.id === id ? data : x; });
    } else {
      entries.push(data);
    }
    saveData();
    form.hidden = true;
    resetForm();
    render();
  });

  cancelBtn.addEventListener('click', function () {
    form.hidden = true;
    resetForm();
  });

  statButtons.forEach(function (btn) {
    btn.addEventListener('click', function () { setFilter(btn.getAttribute('data-filter')); });
  });

  refPeriodSelect.addEventListener('change', function () {
    refWeeks = Number(refPeriodSelect.value) === 26 ? 26 : 17;
    saveData();
    renderStats();
  });

  addDayBtn.addEventListener('click', openFormForAdd);
  exportCsvBtn.addEventListener('click', exportCsv);
  exportBackupBtn.addEventListener('click', exportBackup);
  importBackupBtn.addEventListener('click', function () { importFileInput.click(); });
  importFileInput.addEventListener('change', function () {
    var file = importFileInput.files[0];
    importFileInput.value = '';
    if (file) importBackup(file);
  });

  render();
})();
