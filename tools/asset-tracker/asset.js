(function () {
  var STORAGE_KEY = 'nw-asset-tracker-v1';

  var searchInput = document.getElementById('search-input');
  var addBtn = document.getElementById('add-asset-btn');
  var exportCsvBtn = document.getElementById('export-csv-btn');
  var exportBackupBtn = document.getElementById('export-backup-btn');
  var importBackupBtn = document.getElementById('import-backup-btn');
  var importFileInput = document.getElementById('import-file-input');

  var form = document.getElementById('asset-form');
  var idInput = document.getElementById('asset-id');
  var nameInput = document.getElementById('asset-name');
  var categoryInput = document.getElementById('asset-category');
  var serialInput = document.getElementById('asset-serial');
  var assignedInput = document.getElementById('asset-assigned');
  var purchaseInput = document.getElementById('asset-purchase-date');
  var warrantyInput = document.getElementById('asset-warranty-date');
  var notesInput = document.getElementById('asset-notes');
  var saveBtn = document.getElementById('save-asset-btn');
  var cancelBtn = document.getElementById('cancel-edit-btn');

  var tbody = document.getElementById('asset-table-body');
  var emptyEl = document.getElementById('asset-empty');

  var statTotal = document.getElementById('stat-total');
  var statOk = document.getElementById('stat-ok');
  var statExpiring = document.getElementById('stat-expiring');
  var statExpired = document.getElementById('stat-expired');
  var statButtons = document.querySelectorAll('#asset-stats .asset-stat');

  var currentFilter = 'all';

  var exampleAssets = [
    { id: 'example-1', name: 'Example — Dell Latitude 5420', category: 'Laptop', serial: 'DL5420-EXAMPLE', assignedTo: 'Reception desk', purchaseDate: '2023-03-01', warrantyExpiry: '2026-11-01', notes: 'Delete me once you’ve added your own kit.' },
    { id: 'example-2', name: 'Example — HP LaserJet M404', category: 'Printer', serial: 'HP404-EXAMPLE', assignedTo: 'Office', purchaseDate: '2022-06-15', warrantyExpiry: '2024-06-15', notes: '' },
    { id: 'example-3', name: 'Example — HP EliteBook 840 G9', category: 'Laptop', serial: 'HPEB840-EXAMPLE', assignedTo: 'Sales team — Dave', purchaseDate: '2024-01-10', warrantyExpiry: '2027-01-10', notes: '' },
    { id: 'example-4', name: 'Example — Dell UltraSharp U2722D', category: 'Monitor', serial: 'DLU2722-EXAMPLE', assignedTo: 'Design desk', purchaseDate: '2023-10-05', warrantyExpiry: '2026-10-05', notes: '' },
    { id: 'example-5', name: 'Example — iPhone 13', category: 'Phone / tablet', serial: 'IP13-EXAMPLE', assignedTo: 'Field engineer — Priya', purchaseDate: '2023-09-01', warrantyExpiry: '2025-09-01', notes: '' },
    { id: 'example-6', name: 'Example — Netgear GS724T Switch', category: 'Network equipment', serial: 'NGGS724-EXAMPLE', assignedTo: 'Server room', purchaseDate: '2022-11-01', warrantyExpiry: '', notes: '' },
    { id: 'example-7', name: 'Example — Canon imageCLASS MF445dw', category: 'Printer', serial: 'CANMF445-EXAMPLE', assignedTo: 'Accounts office', purchaseDate: '2023-10-01', warrantyExpiry: '2026-10-01', notes: '' },
    { id: 'example-8', name: 'Example — Lenovo ThinkPad X1 Carbon', category: 'Laptop', serial: 'LNX1C-EXAMPLE', assignedTo: 'Managing Director', purchaseDate: '2025-01-15', warrantyExpiry: '2028-01-15', notes: '' },
    { id: 'example-9', name: 'Example — Samsung Galaxy Tab A8', category: 'Phone / tablet', serial: 'SGTA8-EXAMPLE', assignedTo: 'Warehouse — stock checks', purchaseDate: '2023-07-01', warrantyExpiry: '2025-07-01', notes: '' },
    { id: 'example-10', name: 'Example — Ubiquiti UniFi Dream Machine', category: 'Network equipment', serial: 'UBUDM-EXAMPLE', assignedTo: 'Comms cupboard', purchaseDate: '2024-08-01', warrantyExpiry: '2026-08-01', notes: '' },
    { id: 'example-11', name: 'Example — Apple iMac 24"', category: 'Desktop', serial: 'IMAC24-EXAMPLE', assignedTo: 'Marketing — Sam', purchaseDate: '2024-03-01', warrantyExpiry: '2027-03-01', notes: '' },
    { id: 'example-12', name: 'Example — Yale CCTV NVR', category: 'Other', serial: 'YALENVR-EXAMPLE', assignedTo: 'Warehouse', purchaseDate: '2023-04-01', warrantyExpiry: '2025-04-01', notes: '' }
  ];

  function loadAssets() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return exampleAssets.slice();
    }
    if (raw === null) return null;
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveAssets() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(assets)); } catch (e) {}
  }

  var assets = loadAssets();
  if (assets === null) {
    assets = exampleAssets.slice();
    saveAssets();
  }

  function newId() {
    return 'a-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var target = new Date(dateStr + 'T00:00:00');
    if (isNaN(target.getTime())) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function warrantyStatus(asset) {
    var days = daysUntil(asset.warrantyExpiry);
    if (days === null) return { label: 'No warranty date', cls: 'neutral', sortKey: Infinity };
    if (days < 0) {
      var agoDays = Math.abs(days);
      return { label: 'Expired ' + agoDays + ' day' + (agoDays === 1 ? '' : 's') + ' ago', cls: 'bad', sortKey: days };
    }
    if (days === 0) return { label: 'Expires today', cls: 'warn', sortKey: days };
    if (days <= 30) return { label: 'Expires in ' + days + ' day' + (days === 1 ? '' : 's'), cls: 'warn', sortKey: days };
    return { label: 'Until ' + formatDate(asset.warrantyExpiry), cls: 'ok', sortKey: days };
  }

  function resetForm() {
    form.reset();
    idInput.value = '';
    saveBtn.textContent = 'Add asset';
  }

  function openFormForAdd() {
    resetForm();
    form.hidden = false;
    nameInput.focus();
  }

  function openFormForEdit(asset) {
    idInput.value = asset.id;
    nameInput.value = asset.name || '';
    categoryInput.value = asset.category || 'Laptop';
    serialInput.value = asset.serial || '';
    assignedInput.value = asset.assignedTo || '';
    purchaseInput.value = asset.purchaseDate || '';
    warrantyInput.value = asset.warrantyExpiry || '';
    notesInput.value = asset.notes || '';
    saveBtn.textContent = 'Update asset';
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function deleteAsset(id) {
    var asset = assets.filter(function (a) { return a.id === id; })[0];
    if (!asset) return;
    if (!window.confirm('Delete "' + asset.name + '"? This can’t be undone.')) return;
    assets = assets.filter(function (a) { return a.id !== id; });
    saveAssets();
    render();
  }

  function renderStats() {
    var ok = 0, warn = 0, bad = 0;
    assets.forEach(function (a) {
      var status = warrantyStatus(a);
      if (status.cls === 'ok') ok++;
      else if (status.cls === 'warn') warn++;
      else if (status.cls === 'bad') bad++;
    });
    statTotal.textContent = assets.length;
    statOk.textContent = ok;
    statExpiring.textContent = warn;
    statExpired.textContent = bad;

    statButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
    });
  }

  function renderTable() {
    var query = searchInput.value.trim().toLowerCase();
    var filtered = assets.filter(function (a) {
      if (query) {
        var matches = (a.name || '').toLowerCase().indexOf(query) !== -1 ||
          (a.serial || '').toLowerCase().indexOf(query) !== -1 ||
          (a.assignedTo || '').toLowerCase().indexOf(query) !== -1;
        if (!matches) return false;
      }
      if (currentFilter !== 'all' && warrantyStatus(a).cls !== currentFilter) return false;
      return true;
    });

    var rows = filtered.map(function (a) {
      return { asset: a, status: warrantyStatus(a) };
    });
    rows.sort(function (x, y) { return x.status.sortKey - y.status.sortKey; });

    tbody.textContent = '';
    rows.forEach(function (entry) {
      var a = entry.asset;
      var status = entry.status;
      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      var nameDiv = document.createElement('div');
      nameDiv.className = 'asset-name';
      nameDiv.textContent = a.name;
      var catDiv = document.createElement('div');
      catDiv.className = 'asset-category';
      catDiv.textContent = a.category || '';
      tdName.appendChild(nameDiv);
      tdName.appendChild(catDiv);

      var tdSerial = document.createElement('td');
      tdSerial.textContent = a.serial || '—';

      var tdAssigned = document.createElement('td');
      tdAssigned.textContent = a.assignedTo || '—';

      var tdWarranty = document.createElement('td');
      var badge = document.createElement('span');
      badge.className = 'warranty-badge ' + status.cls;
      badge.textContent = status.label;
      tdWarranty.appendChild(badge);

      var tdActions = document.createElement('td');
      tdActions.className = 'asset-actions';
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'row-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function () { openFormForEdit(a); });
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'row-btn row-btn-danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', function () { deleteAsset(a.id); });
      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);

      tr.appendChild(tdName);
      tr.appendChild(tdSerial);
      tr.appendChild(tdAssigned);
      tr.appendChild(tdWarranty);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });

    if (rows.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = assets.length === 0
        ? 'No assets yet — add your first one above.'
        : 'No assets match your search or filter.';
    } else {
      emptyEl.hidden = true;
    }
  }

  function setFilter(filter) {
    currentFilter = (currentFilter === filter) ? 'all' : filter;
    render();
  }

  function render() {
    renderStats();
    renderTable();
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
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportCsv() {
    var headers = ['Name', 'Category', 'Serial number', 'Assigned to', 'Purchase date', 'Warranty expiry', 'Notes'];
    var lines = [headers.join(',')];
    assets.forEach(function (a) {
      lines.push([a.name, a.category, a.serial, a.assignedTo, a.purchaseDate, a.warrantyExpiry, a.notes].map(csvEscape).join(','));
    });
    downloadFile(lines.join('\n') + '\n', 'asset-tracker-export.csv', 'text/csv');
  }

  function exportBackup() {
    downloadFile(JSON.stringify(assets, null, 2), 'asset-tracker-backup.json', 'application/json');
  }

  function sanitiseImported(raw) {
    return raw
      .filter(function (x) { return x && typeof x === 'object' && typeof x.name === 'string' && x.name.trim() !== ''; })
      .map(function (x) {
        return {
          id: typeof x.id === 'string' && x.id ? x.id : newId(),
          name: x.name,
          category: typeof x.category === 'string' ? x.category : 'Other',
          serial: typeof x.serial === 'string' ? x.serial : '',
          assignedTo: typeof x.assignedTo === 'string' ? x.assignedTo : '',
          purchaseDate: typeof x.purchaseDate === 'string' ? x.purchaseDate : '',
          warrantyExpiry: typeof x.warrantyExpiry === 'string' ? x.warrantyExpiry : '',
          notes: typeof x.notes === 'string' ? x.notes : ''
        };
      });
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var cleaned;
      try {
        var parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error('not an array');
        cleaned = sanitiseImported(parsed);
      } catch (e) {
        window.alert('Couldn’t read that file as a backup — make sure it’s a JSON file exported from this tool.');
        return;
      }
      if (!cleaned.length) {
        window.alert('That file doesn’t contain any valid assets.');
        return;
      }
      var ok = window.confirm('Import ' + cleaned.length + ' asset(s)? This will replace the ' + assets.length + ' asset(s) currently stored in this browser.');
      if (!ok) return;
      assets = cleaned;
      saveAssets();
      render();
    };
    reader.readAsText(file);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }

    var id = idInput.value;
    var data = {
      id: id || newId(),
      name: name,
      category: categoryInput.value,
      serial: serialInput.value.trim(),
      assignedTo: assignedInput.value.trim(),
      purchaseDate: purchaseInput.value,
      warrantyExpiry: warrantyInput.value,
      notes: notesInput.value.trim()
    };

    if (id) {
      assets = assets.map(function (a) { return a.id === id ? data : a; });
    } else {
      assets.push(data);
    }
    saveAssets();
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

  addBtn.addEventListener('click', openFormForAdd);
  searchInput.addEventListener('input', renderTable);
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
