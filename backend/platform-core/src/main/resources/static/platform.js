/* Keeps the landing page in step with /api/platform/runtime. */

(() => {
    const REFRESH_MS = 5000;
    const endpoint = 'api/platform/runtime';

    const bind = (name, value) => {
        document.querySelectorAll(`[data-bind="${name}"]`).forEach(node => {
            node.textContent = value;
        });
    };

    const percent = ratio => `${(ratio * 100).toFixed(1)}%`;

    const renderComponents = components => {
        const list = document.querySelector('[data-bind="components"]');
        if (!list) {
            return;
        }
        list.replaceChildren(...components.map(component => {
            const item = document.createElement('li');
            const dot = document.createElement('span');
            dot.className = `dot ${component.status === 'UP' ? 'dot--up' : 'dot--down'}`;
            const name = document.createElement('span');
            name.className = 'check-name';
            name.textContent = component.name;
            const status = document.createElement('span');
            status.className = 'check-status';
            status.textContent = component.status;
            item.append(dot, name, status);
            return item;
        }));
    };

    const renderStatus = status => {
        const badge = document.querySelector('.status');
        if (!badge) {
            return;
        }
        badge.classList.toggle('status--up', status === 'UP');
        badge.classList.toggle('status--down', status !== 'UP');
        bind('status', status);
    };

    const render = snapshot => {
        renderStatus(snapshot.status);
        bind('version', snapshot.version);
        bind('uptime', snapshot.uptime.display);
        bind('heap', snapshot.heap.usedDisplay);
        bind('heapMax', snapshot.heap.maxDisplay);
        bind('nonHeap', snapshot.nonHeap.usedDisplay);
        bind('cpu', percent(snapshot.cpu.process));
        bind('threads', snapshot.threads.live);
        bind('threadsPeak', snapshot.threads.peak);
        bind('threadsDaemon', snapshot.threads.daemon);
        bind('requests', snapshot.http.requests);
        bind('latency', snapshot.http.averageMillis);
        bind('slowest', snapshot.http.slowestMillis);
        bind('clientErrors', snapshot.http.clientErrors);
        bind('serverErrors', snapshot.http.serverErrors);
        bind('dbActive', snapshot.database.active);
        bind('dbIdle', snapshot.database.idle);
        bind('dbMax', snapshot.database.max);
        bind('sampledAt', new Date(snapshot.sampledAt).toLocaleTimeString());

        const meter = document.querySelector('[data-meter="heap"]');
        if (meter) {
            meter.style.width = percent(snapshot.heap.usedRatio);
        }

        renderComponents(snapshot.components);
    };

    const poll = async () => {
        try {
            const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
            if (response.ok) {
                render(await response.json());
            }
        } catch {
            renderStatus('DOWN');
        }
    };

    /* Pause while the tab is hidden: an idle background tab does not need the traffic. */
    let timer = setInterval(poll, REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
        clearInterval(timer);
        if (!document.hidden) {
            poll();
            timer = setInterval(poll, REFRESH_MS);
        }
    });
})();
