/* eslint-disable @typescript-eslint/no-unused-vars */
// This frontend script is called from the html, so some functions appear unused.

let state = [];

const startAllDockerBtn = document.querySelector('.start-all-docker');
const stopAllDockerBtn = document.querySelector('.stop-all-docker');
const startAllProgramsBtn = document.querySelector('.start-all-programs');
const stopAllProgramsBtn = document.querySelector('.stop-all-programs');

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
        const res = await fetch(path, opts);
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

function createPostOptions(body) {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}

async function serviceGroupAction(serviceGroup, action) {
    return api(
        `/api/service-groups/${encodeURIComponent(serviceGroup)}/all/${encodeURIComponent(action)}`,
        createPostOptions({ action })
    );
}

async function serviceAction(group, service, action) {
    return api(
        `/api/service-groups/${encodeURIComponent(group)}/services/${encodeURIComponent(service)}/${encodeURIComponent(action)}`,
        createPostOptions({ action })
    );  
}

function viewLogs(serviceGroup, serviceId) {
    window.location.href = `/logs.html?serviceGroup=${encodeURIComponent(serviceGroup)}&serviceId=${encodeURIComponent(serviceId)}`;
}

function renderServiceGroup(serviceGroupName, services) {
    const grid = document.getElementById(`${serviceGroupName}-grid`);
    const tmpl = document.getElementById('service-card-template');
    grid.innerHTML = ''; // clear

    const frag = document.createDocumentFragment();
    for (const p of services) {
        // clone the template content
        const clone = tmpl.content.cloneNode(true);

        // fill values (assumes elements exist with these classes)
        const titleEl = clone.querySelector('.card-title');
        if (titleEl) titleEl.textContent = p.serviceName;

        const statusEl = clone.querySelector('.status');
        if (statusEl) statusEl.textContent = p.status;

        // buttons - find them in the clone and wire handlers
        const startBtn = clone.querySelector('.btn-start');
        if (startBtn) {
            startBtn.disabled = (p.status === 'running');
            startBtn.addEventListener('click', () => serviceAction(p.serviceGroup, p.serviceId, 'start'));
        }

        const stopBtn = clone.querySelector('.btn-stop');
        if (stopBtn) {
            stopBtn.disabled = (p.status !== 'running');
            stopBtn.addEventListener('click', () => serviceAction(p.serviceGroup, p.serviceId, 'stop'));
        }

        const restartBtn = clone.querySelector('.btn-restart');
        if (restartBtn) {
            restartBtn.disabled = (p.status !== 'running');
            restartBtn.addEventListener('click', () => serviceAction(p.serviceGroup, p.serviceId, 'restart'));
        }

        const logsBtn = clone.querySelector('.btn-logs');
        if (logsBtn) {
            logsBtn.addEventListener('click', () => viewLogs(p.serviceGroup, p.serviceId));
        }

        frag.appendChild(clone);
    }

    grid.appendChild(frag);
}

// SSE for live updates
const es = new EventSource('/api/serviceStatusEvents');

function setConnectionStatus(connected) {
    const banner = document.getElementById('connection-banner');
    if (banner) {
        banner.classList.toggle('hidden', connected);
    }
}

es.onopen = () => {
    console.log('SSE connected');
    setConnectionStatus(true);
};

function refresh() {
    console.log('Refreshing dashboard UI');
    renderServiceGroup('programs', state.filter(s => s.serviceGroup === 'programs'));
    renderServiceGroup('docker', state.filter(s => s.serviceGroup === 'docker'));
}

function serviceItemArrayEquals(a, b) {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        const itemA = a[i];
        const itemB = b.find(bItem =>
            bItem.serviceGroup === itemA.serviceGroup &&
            bItem.serviceId === itemA.serviceId &&
            bItem.status === itemA.status
        );

        if (!itemB) return false;
    }
    return true;
}

function serviceItemArraySort(serviceItems) {
    return serviceItems.sort((a, b) => {
        const groupCompare = a.serviceGroup.localeCompare(b.serviceGroup);
        if (groupCompare !== 0) return groupCompare;
        return a.serviceId.localeCompare(b.serviceId);
    });
}


es.onmessage = (e) => {
    setConnectionStatus(true); // Mark as connected on any message
    try {
        const payload = JSON.parse(e.data);

        if (payload && Array.isArray(payload.statuses)) {
            const hasChanged = !serviceItemArrayEquals(state, payload.statuses);
            if (!hasChanged) return; // No changes, skip update
            state = serviceItemArraySort(payload.statuses);

            updateStartStopButtons();
        } else {
            console.error('Invalid SSE payload: missing statuses array');
        }
        refresh();
    } catch (err) {
        console.error('Failed to parse SSE payload', err);
    }
};
es.onerror = () => {
    console.warn('SSE disconnected, retrying...');
    setConnectionStatus(false);
};

function updateStartStopButtons() {
    const dockerStatuses = state.filter(s => s.serviceGroup === 'docker').map(s => s.status);

    startAllDockerBtn.disabled = dockerStatuses.every(status => status === 'running');
    stopAllDockerBtn.disabled = dockerStatuses.every(status => status !== 'running');

    const programsStatuses = state.filter(s => s.serviceGroup === 'programs').map(s => s.status);
    startAllProgramsBtn.disabled = programsStatuses.every(status => status === 'running');
    stopAllProgramsBtn.disabled = programsStatuses.every(status => status !== 'running');
}
