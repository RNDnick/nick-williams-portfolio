(function () {
  var fields = {
    orgName: document.getElementById('org-name'),
    minLength: document.getElementById('min-length'),
    requireUpper: document.getElementById('require-upper'),
    requireLower: document.getElementById('require-lower'),
    requireNumber: document.getElementById('require-number'),
    requireSymbol: document.getElementById('require-symbol'),
    encouragePassphrase: document.getElementById('encourage-passphrase'),
    expiry: document.getElementById('expiry'),
    historyCount: document.getElementById('history-count'),
    lockoutThreshold: document.getElementById('lockout-threshold'),
    lockoutDuration: document.getElementById('lockout-duration'),
    requireMfa: document.getElementById('require-mfa'),
    recommendManager: document.getElementById('recommend-manager')
  };

  var previewEl = document.getElementById('policy-preview');
  var copyBtn = document.getElementById('copy-policy-btn');
  var downloadBtn = document.getElementById('download-policy-btn');

  function todayFormatted() {
    return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function buildPolicy(config) {
    var blocks = [];
    var sectionNum = 1;

    function h2(title) {
      blocks.push({ type: 'h2', text: sectionNum + '. ' + title });
      sectionNum++;
    }
    function p(text) { blocks.push({ type: 'p', text: text }); }
    function ul(items) { blocks.push({ type: 'ul', items: items }); }

    blocks.push({ type: 'title', text: config.orgName + ' — Password Policy' });
    blocks.push({ type: 'meta', text: 'Effective from ' + todayFormatted() + '. Reviewed at least annually.' });

    h2('Purpose');
    p('This policy sets out the minimum requirements for creating and managing passwords used to access ' + config.orgName + '’s systems, applications and data. Its aim is to reduce the risk of unauthorised access while keeping passwords practical enough that people actually follow the policy.');

    h2('Scope');
    p('This policy applies to all employees, contractors and third parties who are issued credentials to access ' + config.orgName + '’s IT systems, whether on company-owned or personal devices.');

    h2('Password requirements');
    var reqItems = ['At least ' + config.minLength + ' characters long.'];
    if (config.requireUpper) reqItems.push('Contains at least one uppercase letter (A–Z).');
    if (config.requireLower) reqItems.push('Contains at least one lowercase letter (a–z).');
    if (config.requireNumber) reqItems.push('Contains at least one number (0–9).');
    if (config.requireSymbol) reqItems.push('Contains at least one special character (e.g. ! @ # $ % ^ & *).');
    reqItems.push('Must not contain the person’s username, real name, or the organisation’s name.');
    reqItems.push('Must not be a password known to have appeared in a public data breach, where technical controls allow this to be checked automatically.');
    ul(reqItems);
    if (config.encouragePassphrase) {
      p('A passphrase of several unrelated words (for example, "correct-horse-battery-staple") is acceptable in place of a shorter complex password, provided it meets the minimum length above. Passphrases are often easier to remember and just as strong, if not stronger.');
    }

    h2('Changing your password');
    if (config.expiry === 'never') {
      p('Passwords do not need to be changed on a fixed schedule. Mandatory periodic expiry tends to push people toward small, predictable changes (Password1, Password2…) that are easier to guess, not harder — this approach follows current NIST SP 800-63B guidance. A password must be changed immediately if there is any suspicion it has been compromised, or if directed to do so following a security incident.');
    } else {
      p('Passwords must be changed at least every ' + config.expiry + ' days, and immediately if there is any suspicion a password has been compromised.');
      p('Note: current best-practice guidance (NIST SP 800-63B) suggests fixed-schedule password expiry offers limited security benefit and can encourage weaker passwords. Consider moving to risk-based or breach-triggered changes instead, if your compliance requirements allow it.');
    }

    h2('Reusing old passwords');
    if (config.historyCount > 0) {
      p('A new password must not match any of the last ' + config.historyCount + ' passwords used on the account.');
    } else {
      p('There is no technical restriction on reusing previous passwords, though doing so is discouraged.');
    }

    h2('Account lockout');
    p('After ' + config.lockoutThreshold + ' consecutive failed login attempts, the account will be locked for ' + config.lockoutDuration + ' minutes before another attempt can be made. This protects against automated password-guessing (brute-force) attacks.');

    if (config.requireMfa) {
      h2('Multi-factor authentication');
      p('Multi-factor authentication (MFA) is required in addition to a password for all accounts that support it, particularly email, VPN access, and any system holding personal or financial data. A password alone is not considered sufficient protection for these systems.');
    }

    h2('Storing and sharing passwords');
    var storageText = 'Passwords must never be shared with another person, written down in an unsecured location (such as on a sticky note), or reused across personal and work accounts.';
    if (config.recommendManager) {
      storageText += ' Staff are encouraged to use a company-approved password manager to generate and store a unique password for every account.';
    }
    p(storageText);

    h2('Enforcement');
    p('Failure to comply with this policy may result in disciplinary action and, where appropriate, restriction or suspension of system access. IT reserves the right to enforce these requirements through technical controls.');

    h2('Review');
    p('This policy will be reviewed at least annually, or sooner following a significant change in guidance or a security incident.');

    return blocks;
  }

  function renderPreview(blocks) {
    previewEl.textContent = '';
    blocks.forEach(function (b) {
      var el;
      if (b.type === 'title') {
        el = document.createElement('h2');
        el.className = 'policy-title';
        el.textContent = b.text;
      } else if (b.type === 'meta') {
        el = document.createElement('p');
        el.className = 'policy-meta';
        el.textContent = b.text;
      } else if (b.type === 'h2') {
        el = document.createElement('h3');
        el.className = 'policy-h2';
        el.textContent = b.text;
      } else if (b.type === 'p') {
        el = document.createElement('p');
        el.className = 'policy-p';
        el.textContent = b.text;
      } else if (b.type === 'ul') {
        el = document.createElement('ul');
        el.className = 'policy-ul';
        b.items.forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          el.appendChild(li);
        });
      }
      if (el) previewEl.appendChild(el);
    });
  }

  function blocksToText(blocks) {
    var lines = [];
    blocks.forEach(function (b) {
      if (b.type === 'title' || b.type === 'meta') {
        lines.push(b.text, '');
      } else if (b.type === 'h2') {
        lines.push(b.text);
      } else if (b.type === 'p') {
        lines.push(b.text, '');
      } else if (b.type === 'ul') {
        b.items.forEach(function (item) { lines.push('- ' + item); });
        lines.push('');
      }
    });
    return lines.join('\n').trim() + '\n';
  }

  var currentText = '';

  function numOr(raw, fallback) {
    var n = Number(raw);
    return isNaN(n) ? fallback : n;
  }

  function render() {
    var config = {
      orgName: fields.orgName.value.trim() || 'Your Organisation',
      minLength: Math.min(64, Math.max(8, numOr(fields.minLength.value, 14))),
      requireUpper: fields.requireUpper.checked,
      requireLower: fields.requireLower.checked,
      requireNumber: fields.requireNumber.checked,
      requireSymbol: fields.requireSymbol.checked,
      encouragePassphrase: fields.encouragePassphrase.checked,
      expiry: fields.expiry.value,
      historyCount: Math.min(24, Math.max(0, numOr(fields.historyCount.value, 5))),
      lockoutThreshold: Math.min(20, Math.max(1, numOr(fields.lockoutThreshold.value, 5))),
      lockoutDuration: Math.min(1440, Math.max(1, numOr(fields.lockoutDuration.value, 30))),
      requireMfa: fields.requireMfa.checked,
      recommendManager: fields.recommendManager.checked
    };

    var blocks = buildPolicy(config);
    renderPreview(blocks);
    currentText = blocksToText(blocks);
  }

  Object.keys(fields).forEach(function (key) {
    var el = fields[key];
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  copyBtn.addEventListener('click', function () {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(currentText).then(function () {
      var original = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = original; }, 1500);
    }).catch(function () {});
  });

  downloadBtn.addEventListener('click', function () {
    var orgSlug = (fields.orgName.value.trim() || 'organisation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    var blob = new Blob([currentText], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = orgSlug + '-password-policy.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  render();
})();
