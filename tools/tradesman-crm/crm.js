// Tradesman CRM — live demo
// Everything here runs client-side against localStorage. No server, no
// network calls — this is a sales demo, not the product itself.

const STORAGE_KEY = 'tradesmanCrmDemo_v1';

const STATUSES = ['Quoted', 'Scheduled', 'In Progress', 'Invoiced', 'Paid'];

let state = null;
let selectedClientId = null;

// ---------------------------------------------------------------------------
// Seed data — dates are generated relative to "today" so the demo always
// looks current, whenever it's reset.
// ---------------------------------------------------------------------------
function relDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function seedState() {
  const clients = [
    { id: uid('c'), name: 'Sarah Whitfield', company: 'Whitfield Properties', phone: '07700 900123', email: 'sarah@whitfieldproperties.co.uk' },
    { id: uid('c'), name: 'Mike Osei', company: '', phone: '07700 900456', email: 'mike.osei@example.com' },
    { id: uid('c'), name: 'Priya Kaur', company: '', phone: '07700 900789', email: 'priya.kaur@example.com' },
    { id: uid('c'), name: 'Dan Fletcher', company: 'Bright Spark Ltd', phone: '07700 900321', email: 'dan@brightsparkltd.co.uk' },
  ];

  const jobs = [
    { id: uid('j'), clientId: clients[0].id, title: 'Rewire — 14 Church Street flat', status: 'Paid', value: 1450, date: relDate(-24), notes: 'Full rewire between tenancies.' },
    { id: uid('j'), clientId: clients[0].id, title: 'EICR — 22 Mill Lane', status: 'Invoiced', value: 180, date: relDate(-6), notes: 'Landlord certificate, 5-year renewal.' },
    { id: uid('j'), clientId: clients[0].id, title: 'EICR — 9 Park View', status: 'Scheduled', value: 180, date: relDate(9), notes: '' },
    { id: uid('j'), clientId: clients[1].id, title: 'Consumer unit upgrade', status: 'In Progress', value: 620, date: relDate(2), notes: 'Old fuse board failed PAT test.' },
    { id: uid('j'), clientId: clients[2].id, title: 'Kitchen extension — first fix', status: 'Quoted', value: 2100, date: relDate(15), notes: 'Waiting on go-ahead from builder.' },
    { id: uid('j'), clientId: clients[3].id, title: 'Office rewire — Unit 4', status: 'In Progress', value: 3200, date: relDate(4), notes: 'Phased over two weekends to avoid downtime.' },
    { id: uid('j'), clientId: clients[3].id, title: 'Emergency lighting install', status: 'Paid', value: 540, date: relDate(-11), notes: '' },
  ];

  return { clients, jobs };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Corrupt or inaccessible storage — fall through to a fresh seed.
  }
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}

function saveState(next) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage unavailable (private browsing etc.) — demo still works for
    // the current page view, it just won't persist on reload.
  }
}

function resetDemo() {
  if (!confirm('Reset the demo back to its sample data? Anything you\'ve added will be lost.')) return;
  selectedClientId = null;
  saveState(seedState());
  renderAll();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatMoney(n) {
  return `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusClass(status) {
  return `status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

function jobsForClient(clientId) {
  return state.jobs.filter((j) => j.clientId === clientId);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderStats() {
  const openJobs = state.jobs.filter((j) => j.status !== 'Paid');
  const pipelineValue = openJobs.reduce((sum, j) => sum + Number(j.value), 0);

  const now = new Date();
  const paidThisMonth = state.jobs
    .filter((j) => {
      if (j.status !== 'Paid') return false;
      const d = new Date(j.date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, j) => sum + Number(j.value), 0);

  document.getElementById('stat-clients').textContent = state.clients.length;
  document.getElementById('stat-open-jobs').textContent = openJobs.length;
  document.getElementById('stat-pipeline').textContent = formatMoney(pipelineValue);
  document.getElementById('stat-paid-month').textContent = formatMoney(paidThisMonth);
}

function renderClients() {
  const list = document.getElementById('client-list');

  if (!state.clients.length) {
    list.innerHTML = '<li class="crm-empty">No clients yet — add one to get started.</li>';
    return;
  }

  list.innerHTML = state.clients
    .map((c) => {
      const jobCount = jobsForClient(c.id).length;
      const selected = c.id === selectedClientId ? ' selected' : '';
      return `
        <li>
          <button type="button" class="client-row${selected}" data-client-id="${c.id}">
            <span class="client-row-name">${escapeHtml(c.name)}</span>
            ${c.company ? `<span class="client-row-company">${escapeHtml(c.company)}</span>` : ''}
            <span class="client-row-count">${jobCount} job${jobCount === 1 ? '' : 's'}</span>
          </button>
        </li>`;
    })
    .join('');
}

function renderJobs() {
  const panel = document.getElementById('jobs-panel');

  if (!selectedClientId) {
    panel.innerHTML = '<p class="crm-empty">Select a client on the left to see their jobs.</p>';
    return;
  }

  const client = state.clients.find((c) => c.id === selectedClientId);
  if (!client) {
    selectedClientId = null;
    panel.innerHTML = '<p class="crm-empty">Select a client on the left to see their jobs.</p>';
    return;
  }

  const jobs = jobsForClient(client.id).sort((a, b) => (a.date < b.date ? -1 : 1));

  const header = `
    <div class="jobs-panel-head">
      <div>
        <h3>${escapeHtml(client.name)}</h3>
        <p class="client-meta">${[client.company, client.phone, client.email].filter(Boolean).map(escapeHtml).join(' · ')}</p>
      </div>
      <div class="jobs-panel-actions">
        <button type="button" class="btn btn-secondary btn-small" id="edit-client-btn">Edit client</button>
        <button type="button" class="btn btn-primary btn-small" id="add-job-btn">+ Add job</button>
      </div>
    </div>`;

  if (!jobs.length) {
    panel.innerHTML = `${header}<p class="crm-empty">No jobs yet for ${escapeHtml(client.name)}.</p>`;
    return;
  }

  const rows = jobs
    .map(
      (j) => `
        <li class="job-row">
          <div class="job-row-main">
            <span class="${statusClass(j.status)}">${j.status}</span>
            <span class="job-title">${escapeHtml(j.title)}</span>
          </div>
          <div class="job-row-meta">
            <span>${formatDate(j.date)}</span>
            <span>${formatMoney(j.value)}</span>
            <button type="button" class="text-link" data-edit-job="${j.id}">Edit</button>
            <button type="button" class="text-link text-link-danger" data-delete-job="${j.id}">Delete</button>
          </div>
          ${j.notes ? `<p class="job-notes">${escapeHtml(j.notes)}</p>` : ''}
        </li>`
    )
    .join('');

  panel.innerHTML = `${header}<ul class="job-list">${rows}</ul>`;
}

function renderAll() {
  renderStats();
  renderClients();
  renderJobs();
}

// ---------------------------------------------------------------------------
// Client dialog
// ---------------------------------------------------------------------------
const clientDialog = document.getElementById('client-dialog');
const clientForm = document.getElementById('client-form');

function openClientDialog(client) {
  clientForm.reset();
  clientForm.elements.id.value = client ? client.id : '';
  if (client) {
    clientForm.elements.name.value = client.name;
    clientForm.elements.company.value = client.company || '';
    clientForm.elements.phone.value = client.phone || '';
    clientForm.elements.email.value = client.email || '';
  }
  document.getElementById('client-dialog-title').textContent = client ? 'Edit client' : 'Add client';
  clientDialog.showModal();
}

clientForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(clientForm);
  const id = data.get('id');
  const record = {
    id: id || uid('c'),
    name: data.get('name').trim(),
    company: data.get('company').trim(),
    phone: data.get('phone').trim(),
    email: data.get('email').trim(),
  };
  if (!record.name) return;

  if (id) {
    state.clients = state.clients.map((c) => (c.id === id ? record : c));
  } else {
    state.clients.push(record);
    selectedClientId = record.id;
  }
  saveState(state);
  renderAll();
  clientDialog.close();
});

// ---------------------------------------------------------------------------
// Job dialog
// ---------------------------------------------------------------------------
const jobDialog = document.getElementById('job-dialog');
const jobForm = document.getElementById('job-form');

function openJobDialog(clientId, job) {
  jobForm.reset();
  jobForm.elements.id.value = job ? job.id : '';
  jobForm.elements.clientId.value = clientId;
  if (job) {
    jobForm.elements.title.value = job.title;
    jobForm.elements.status.value = job.status;
    jobForm.elements.value.value = job.value;
    jobForm.elements.date.value = job.date;
    jobForm.elements.notes.value = job.notes || '';
  } else {
    jobForm.elements.status.value = 'Quoted';
    jobForm.elements.date.value = relDate(7);
  }
  document.getElementById('job-dialog-title').textContent = job ? 'Edit job' : 'Add job';
  jobDialog.showModal();
}

jobForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(jobForm);
  const id = data.get('id');
  const record = {
    id: id || uid('j'),
    clientId: data.get('clientId'),
    title: data.get('title').trim(),
    status: data.get('status'),
    value: Number(data.get('value')) || 0,
    date: data.get('date'),
    notes: data.get('notes').trim(),
  };
  if (!record.title) return;

  if (id) {
    state.jobs = state.jobs.map((j) => (j.id === id ? record : j));
  } else {
    state.jobs.push(record);
  }
  saveState(state);
  renderAll();
  jobDialog.close();
});

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
document.getElementById('add-client-btn').addEventListener('click', () => openClientDialog(null));
document.getElementById('reset-demo-btn').addEventListener('click', resetDemo);

document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
  btn.addEventListener('click', () => btn.closest('dialog').close());
});

document.getElementById('client-list').addEventListener('click', (e) => {
  const row = e.target.closest('[data-client-id]');
  if (!row) return;
  selectedClientId = row.dataset.clientId;
  renderClients();
  renderJobs();
});

document.getElementById('jobs-panel').addEventListener('click', (e) => {
  if (e.target.id === 'add-job-btn') {
    openJobDialog(selectedClientId, null);
    return;
  }
  if (e.target.id === 'edit-client-btn') {
    const client = state.clients.find((c) => c.id === selectedClientId);
    openClientDialog(client);
    return;
  }
  const editId = e.target.dataset.editJob;
  if (editId) {
    const job = state.jobs.find((j) => j.id === editId);
    openJobDialog(selectedClientId, job);
    return;
  }
  const deleteId = e.target.dataset.deleteJob;
  if (deleteId) {
    if (!confirm('Delete this job?')) return;
    state.jobs = state.jobs.filter((j) => j.id !== deleteId);
    saveState(state);
    renderAll();
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
state = loadState();
if (state.clients.length) selectedClientId = state.clients[0].id;
renderAll();
