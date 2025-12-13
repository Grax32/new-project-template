/* eslint-disable @typescript-eslint/no-unused-vars */
// This frontend script is called from the html, so some functions appear unused.

(async function () {
    let state = [];

    const startAllDockerBtn = document.querySelector('.start-all-docker');
    const stopAllDockerBtn = document.querySelector('.stop-all-docker');
    const startAllProgramsBtn = document.querySelector('.start-all-programs');
    const stopAllProgramsBtn = document.querySelector('.stop-all-programs');

    // Add event listeners for start/stop all buttons
    if (startAllDockerBtn) {
        startAllDockerBtn.addEventListener('click', () => serviceGroupAction('docker', 'start'));
    }
    if (stopAllDockerBtn) {
        stopAllDockerBtn.addEventListener('click', () => serviceGroupAction('docker', 'stop'));
    }
    if (startAllProgramsBtn) {
        startAllProgramsBtn.addEventListener('click', () => serviceGroupAction('programs', 'start'));
    }
    if (stopAllProgramsBtn) {
        stopAllProgramsBtn.addEventListener('click', () => serviceGroupAction('programs', 'stop'));
    }

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

            const statusEl = clone.querySelector('.status-value');
            if (statusEl) {
                statusEl.textContent = p.status;

                // remove all status classes except the base 'status' class
                statusEl.className = 'status status-value';
                statusEl.classList.add(p.status);
            }

            const statusHealthyEl = clone.querySelector('.status-healthy');
            const statusUnhealthyEl = clone.querySelector('.status-unhealthy');

            const isHealthy = p.healthy === true;

            if (p.status !== 'running') {
                statusHealthyEl.style.display = 'none';
                statusUnhealthyEl.style.display = 'none';
            } else if (isHealthy) {
                statusHealthyEl.style.display = 'inline-block';
                statusUnhealthyEl.style.display = 'none';
            } else {
                statusHealthyEl.style.display = 'none';
                statusUnhealthyEl.style.display = 'inline-block';
            }

            // buttons - find them in the clone and wire handlers
            const startBtn = clone.querySelector('.btn-start');
            const stopBtn = clone.querySelector('.btn-stop');
            const restartBtn = clone.querySelector('.btn-restart');
            const logsBtn = clone.querySelector('.btn-logs');

            if (!startBtn) throw new Error('Start button not found in template');
            if (!stopBtn) throw new Error('Stop button not found in template');
            if (!restartBtn) throw new Error('Restart button not found in template');
            if (!logsBtn) throw new Error('Logs button not found in template');


            stopBtn.addEventListener('click', () => serviceAction(p.serviceGroup, p.serviceId, 'stop'));
            startBtn.addEventListener('click', () => serviceAction(p.serviceGroup, p.serviceId, 'start'));
            restartBtn.addEventListener('click', () => serviceAction(p.serviceGroup, p.serviceId, 'restart'));

            if (p.status === 'running') {
                startBtn.classList.add('hidden');
                stopBtn.classList.remove('hidden');
                restartBtn.classList.remove('hidden');
            } else {
                startBtn.classList.remove('hidden');
                stopBtn.classList.add('hidden');
                restartBtn.classList.add('hidden');
            }

            logsBtn.addEventListener('click', () => viewLogs(p.serviceGroup, p.serviceId));
            frag.appendChild(clone);
        }

        grid.appendChild(frag);
    }

    // load initial service group data and lock it
    async function loadInitialState() {
        const serviceGroupsResponse = await api('/api/services');
        const serviceItems = serviceGroupsResponse.services;

        const services = serviceItemArraySort(serviceItems);
        Object.freeze(services);
        return services;
    }
    const services = await loadInitialState();
    state = services.map(s => ({ ...s }));

    function initializeEventSource() {
        console.log('Configuring EventSource for live updates');
        // SSE for live updates
        const es = new EventSource('/api/serviceStatusEvents');

        es.onopen = () => {
            console.log('SSE connected');
            setConnectionStatus(true);
        };

        function applyStateUpdate(updatedStateItem) {
            let newState = [...state];
            const index = newState.findIndex(item =>
                item.serviceGroup === updatedStateItem.serviceGroup &&
                item.serviceId === updatedStateItem.serviceId
            );
            if (index !== -1) {
                // update status of existing item
                Object.entries(updatedStateItem).forEach(([key, value]) => {
                    newState[index][key] = value;
                });
            } else {
                // add new item
                newState.push(updatedStateItem);
                newState = serviceItemArraySort(newState);
            }
            state = newState;

            updateStartStopButtons();
            refresh();
        }

        es.onmessage = (e) => {
            setConnectionStatus(true); // Mark as connected on any message
            try {
                const payload = JSON.parse(e.data);

                switch (payload.type) {
                    case 'service-status':
                        applyStateUpdate(payload);
                        return;
                    default:
                        console.log('SSE message of unknown type:', payload);
                        break;
                }
            } catch (err) {
                console.error('Failed to parse SSE payload', err);
            }
        };
        es.onerror = () => {
            console.warn('SSE disconnected, retrying...');
            setConnectionStatus(false);
        };
    }

    initializeEventSource();

    function setConnectionStatus(connected) {
        const banner = document.getElementById('connection-banner');
        if (banner) {
            banner.classList.toggle('hidden', connected);
        }
    }

    function refresh() {
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
                bItem.serviceName === itemA.serviceName &&
                bItem.status === itemA.status &&
                bItem.healthy === itemA.healthy
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


    function updateStartStopButtons() {
        const dockerStatuses = state.filter(s => s.serviceGroup === 'docker').map(s => s.status);

        if (dockerStatuses.every(status => status === 'running')) {
            startAllDockerBtn.classList.add('hidden');
        } else {
            startAllDockerBtn.classList.remove('hidden');
        }
        if (dockerStatuses.every(status => status !== 'running')) {
            stopAllDockerBtn.classList.add('hidden');
        } else {
            stopAllDockerBtn.classList.remove('hidden');
        }

        const programsStatuses = state.filter(s => s.serviceGroup === 'programs').map(s => s.status);
        if (programsStatuses.every(status => status === 'running')) {
            startAllProgramsBtn.classList.add('hidden');
        } else {
            startAllProgramsBtn.classList.remove('hidden');
        }
        if (programsStatuses.every(status => status !== 'running')) {
            stopAllProgramsBtn.classList.add('hidden');
        } else {
            stopAllProgramsBtn.classList.remove('hidden');
        }
    }
})();
