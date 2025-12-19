const titleElement = document.getElementById('log-title');
const freezeBtn = document.getElementsByClassName('btn-freeze')[0];
const continueBtn = document.getElementsByClassName('btn-continue')[0];
const logBox = document.getElementById('log-content');

const params = new URLSearchParams(window.location.search);

const serviceGroup = params.get('serviceGroup');
const serviceId = params.get('serviceId');
let serviceName = '';

let updatesFrozen = false;

titleElement.textContent = `Logs: ${serviceName}`;

async function fetchLogs() {
  const res = await fetch(
    `/api/service-groups/${encodeURIComponent(serviceGroup)}/services/${encodeURIComponent(serviceId)}/logs`,
  );
  if (!res.ok) throw new Error(`Failed to load logs (${res.status})`);
  const json = await res.json();

  if (json && typeof json.logHtml === 'string') return json.logHtml ? json.logHtml.split('\n') : [];
  return [];
}

async function refreshLogs() {
  try {
    const logs = await fetchLogs();
    logBox.innerHTML = logs && logs.length ? logs.join('\n') : '(no logs)';
    logBox.scrollTop = logBox.scrollHeight;
  } catch (e) {
    logBox.textContent = `Error loading logs: ${e.message}`;
  }
}

// SSE for live updates
const es = new EventSource('/api/logChangeEvents');
const esStatus = new EventSource('/api/serviceStatusEvents');

es.onopen = () => console.log('Log Change events connected');
esStatus.onopen = () => console.log('Service Status events connected');

titleElement.innerText = `Logs: ${serviceName} (Status: Unknown)`;

es.onmessage = (e) => {
  if (updatesFrozen) return;

  try {
    const payload = JSON.parse(e.data);

    if (payload && ['all', 'initial', serviceGroup, serviceId, serviceId].includes(payload.key)) {
      console.log('Log change event received:', e.data);
      refreshLogs();
    }
  } catch (err) {
    console.error('Error processing log change event:', err);
  }
};

esStatus.onmessage = (e) => {
  const payload = JSON.parse(e.data);

  if (payload && Array.isArray(payload.statuses)) {
    const state = payload.statuses;

    const matchingService = state.find(
      (s) => s.serviceGroup === serviceGroup && s.serviceId === serviceId,
    );

    serviceName = matchingService ? matchingService.serviceName : serviceId;

    if (matchingService) {
      titleElement.innerText = `Logs: ${serviceName} (Status: ${matchingService.status})`;
    } else {
      titleElement.innerText = `Logs: ${serviceName} (Status: Unknown)`;
    }
  }
};

freezeBtn.addEventListener('click', freezeUpdates);
continueBtn.addEventListener('click', continueUpdates);

function freezeUpdates() {
  updatesFrozen = true;
  freezeBtn.style.display = 'none';
  continueBtn.style.display = 'inline-block';
}

function continueUpdates() {
  updatesFrozen = false;
  freezeBtn.style.display = 'inline-block';
  continueBtn.style.display = 'none';
  refreshLogs();
}

// Initial state
continueUpdates();
