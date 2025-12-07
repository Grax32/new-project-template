const API = '';
let state = { docker: [], programs: [] };

function toast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toast-out 0.2s ease-out forwards';
    setTimeout(() => el.remove(), 200);
  }, 4000);
}

async function api(path, opts) {
  try {
    const res = await fetch(API + path, opts);
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || `Request failed: ${res.status}`);
      return null;
    }
    return data;
  } catch (err) {
    toast(`Network error: ${err.message}`);
    return null;
  }
}

async function dockerAction(action, service) {
  await api('/api/docker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, service }) });
  refresh();
}

async function dockerAllAction(action) {
  await api('/api/docker/all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
  refresh();
}

async function programAllAction(action) {
  await api('/api/programs/all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
  refresh();
}

async function programAction(id, action) {
  await api('/api/programs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
  refresh();
}

function viewLogs(type, id) {
  window.location.href = `/logs.html?type=${type}&id=${encodeURIComponent(id)}`;
}

function renderDocker() {
  const grid = document.getElementById('docker-grid');
  grid.innerHTML = state.docker.map(s => `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${s.name}</span>
        <span class="status ${s.status}">${s.status}</span>
      </div>
      <div class="ports">${s.ports || 'No ports exposed'}</div>
      <div class="card-actions">
        <div class="btn-group">
          <button class="btn btn-start" onclick="dockerAction('start','${s.name}')" ${s.status === 'running' ? 'disabled' : ''}>Start</button>
          <button class="btn btn-stop" onclick="dockerAction('stop','${s.name}')" ${s.status !== 'running' ? 'disabled' : ''}>Stop</button>
          <button class="btn btn-restart" onclick="dockerAction('restart','${s.name}')">Restart</button>
        </div>
        <button class="btn btn-logs" onclick="viewLogs('docker','${s.name}')">Logs</button>
      </div>
    </div>
  `).join('') || '<div class="card">No containers found. <button class="btn btn-start" onclick="dockerAction(\'up\')">Start All</button></div>';
}

function renderPrograms() {
  const grid = document.getElementById('programs-grid');
  grid.innerHTML = state.programs.map(p => `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${p.name}</span>
        <span class="status ${p.status}">${p.status}</span>
      </div>
      <div class="card-actions">
        <div class="btn-group">
          <button class="btn btn-start" onclick="programAction('${p.id}','start')" ${p.status === 'running' ? 'disabled' : ''}>Start</button>
          <button class="btn btn-stop" onclick="programAction('${p.id}','stop')" ${p.status !== 'running' ? 'disabled' : ''}>Stop</button>
          <button class="btn btn-restart" onclick="programAction('${p.id}','stop'); setTimeout(() => programAction('${p.id}','start'), 500)">Restart</button>
        </div>
        <button class="btn btn-logs" onclick="viewLogs('program','${p.id}')">Logs</button>
      </div>
    </div>
  `).join('') || '<div class="card">No programs configured.</div>';
}

function refresh() {
  renderDocker();
  renderPrograms();
}

// SSE for live updates
const es = new EventSource(API + '/api/events');
es.onmessage = (e) => {
  state = JSON.parse(e.data);
  refresh();
};
es.onerror = () => console.warn('SSE disconnected, retrying...');
