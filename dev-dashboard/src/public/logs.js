const API = '';
const params = new URLSearchParams(window.location.search);
const type = params.get('type'); // 'docker' or 'program'
const id = params.get('id');

document.getElementById('log-title').textContent = `Logs: ${id}`;

async function fetchLogs() {
  if (type === 'docker') {
    const res = await fetch(`${API}/api/docker/logs/${encodeURIComponent(id)}`);
    return res.json();
  } else {
    const res = await fetch(`${API}/api/logs/${encodeURIComponent(id)}`);
    return res.json();
  }
}

async function refreshLogs() {
  const logBox = document.getElementById('log-content');
  try {
    const logs = await fetchLogs();
    logBox.textContent = logs.length ? logs.join('\n') : '(no logs)';
    logBox.scrollTop = logBox.scrollHeight;
  } catch (e) {
    logBox.textContent = `Error loading logs: ${e.message}`;
  }
}

async function clearLogs() {
  if (type === 'program') {
    await fetch(`${API}/api/logs/${encodeURIComponent(id)}`, { method: 'DELETE' });
    refreshLogs();
  } else {
    alert('Clear is only available for program logs');
  }
}

// Initial load
refreshLogs();

// Auto-refresh every 2 seconds
setInterval(refreshLogs, 2000);
