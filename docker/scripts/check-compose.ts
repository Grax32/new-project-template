#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { spawnSync } from 'child_process';
import readline from 'readline';

function run(cmd: string, args: string[]) {
    try {
        const res = spawnSync(cmd, args, { encoding: 'utf8' });
        return {
            code: res.status ?? 0,
            stdout: (res.stdout || '').toString(),
            stderr: (res.stderr || '').toString(),
        };
    } catch (err: any) {
        return { code: 1, stdout: '', stderr: String(err) };
    }
}

async function prompt(question: string) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise<string>((resolve) =>
        rl.question(question, (ans) => {
            rl.close();
            resolve(ans);
        }),
    );
}

function isRunningState(s: string) {
    const st = (s || '').toLowerCase();
    if (!st) return false;
    if (st.includes('not running')) return false;
    if (st.includes('exited') || st.includes('dead') || st.includes('created')) return false;
    if (st.includes('up')) return true;
    if (st.includes('running')) return true;
    return false;
}

function listServices() {
    // First try to get the list of all services defined in the compose file.
    // `docker compose config --services` reliably lists all service names,
    // even if some services are stopped or have no containers.
    const cfg = run('docker', ['compose', 'config', '--services']);
    const allFromConfig =
        cfg.code === 0 && cfg.stdout.trim()
            ? cfg.stdout
                  .split(/\r?\n/)
                  .map((s) => s.trim())
                  .filter(Boolean)
            : null;

    // Next, try to gather runtime status info from `docker compose ps` JSON output
    // (one JSON object per line). This will include only services with containers
    // (running or stopped), so we map those states into a status map.
    const jsonOut = run('docker', ['compose', 'ps', '--format', '{{json .}}']);
    const items: Array<{ service: string; name: string; state: string }> = [];
    if (jsonOut.code === 0 && jsonOut.stdout.trim()) {
        const lines = jsonOut.stdout
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        for (const line of lines) {
            try {
                const obj = JSON.parse(line) as Record<string, any>;
                const name = (obj.Name || obj.name || '').toString();
                const service = (obj.Service || obj.service || obj.Name || '').toString();
                const state = (obj.State || obj.Status || obj.state || '').toString();
                const svc = service || (name ? name.split(/[-_.]/)[0] : name);
                items.push({ service: svc, name, state });
            } catch (err: any) {
                // ignore parse errors for now
            }
        }
    }

    // Build a status map from parsed items
    const parsedStatusMap: Record<string, string> = {};
    for (const it of items) parsedStatusMap[it.service] = it.state || 'unknown';

    // If we successfully got the list of all defined services from the compose
    // config, use that as the canonical list and ensure every service has a
    // status entry (default to 'not running' when missing).
    if (allFromConfig) {
        for (const s of allFromConfig)
            if (!(s in parsedStatusMap)) parsedStatusMap[s] = 'not running';
        const runningList = allFromConfig.filter((svc) =>
            isRunningState(parsedStatusMap[svc] || ''),
        );
        return { ok: true, all: allFromConfig, running: runningList, statuses: parsedStatusMap };
    }

    // If we couldn't get the config list, but we parsed ps JSON, derive lists
    // from the parsed items (deduplicating service names).
    if (items.length > 0) {
        const allList = Array.from(new Set(items.map((i) => i.service)));
        const runningList = items.filter((i) => isRunningState(i.state)).map((i) => i.service);
        const statusMap2: Record<string, string> = {};
        for (const it of items) statusMap2[it.service] = it.state || 'unknown';
        return { ok: true, all: allList, running: runningList, statuses: statusMap2 };
    }

    // Fallback: older docker compose versions - use service lists
    const all = run('docker', ['compose', 'ps', '--services']);
    if (all.code !== 0) return { ok: false, error: all.stderr || all.stdout };
    const running = run('docker', ['compose', 'ps', '--services', '--filter', 'status=running']);
    if (running.code !== 0) return { ok: false, error: running.stderr || running.stdout };
    const allList = all.stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    const runningList = running.stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    // Build a simple status map: running or not running
    const statusMap: Record<string, string> = {};
    for (const s of allList) statusMap[s] = runningList.includes(s) ? 'running' : 'not running';
    return { ok: true, all: allList, running: runningList, statuses: statusMap };
}

async function main() {
    console.log('Checking Docker daemon...');
    const info = run('docker', ['info']);
    if (info.code !== 0) {
        console.log('Docker CLI not available or Docker daemon is not running.');
        const ans = (
            await prompt(
                'Would you like to try to start Docker Desktop (open Docker UI) now? (y/N): ',
            )
        )
            .trim()
            .toLowerCase();
        if (ans === 'y' || ans === 'yes') {
            console.log('Please start Docker Desktop and press Enter when ready.');
            await prompt('Press Enter to continue after Docker has started, or Ctrl+C to cancel.');
            // re-check
            const info2 = run('docker', ['info']);
            if (info2.code !== 0) {
                console.error('Docker still not available. Aborting.');
                process.exit(2);
            }
        } else {
            console.error('Docker is required. Please start Docker and try again.');
            process.exit(2);
        }
    }

    // At this point docker info succeeded
    const services = listServices();
    if (!services.ok) {
        console.log(
            'Could not read docker compose status. This usually means either there is no docker compose.yml in the current directory or Docker Compose returned an error.',
        );
        console.log('Error output:\n', services.error);
        const ans = (
            await prompt(
                'Would you like to bring up the Compose stack (docker compose up -d)? (y/N): ',
            )
        )
            .trim()
            .toLowerCase();
        if (ans === 'y' || ans === 'yes') {
            console.log('Running: docker compose up -d');
            const up = run('docker', ['compose', 'up', '-d']);
            if (up.code !== 0) {
                console.error('Failed to start compose stack:', up.stderr || up.stdout);
                process.exit(3);
            }
            console.log('Compose stack started.');
            process.exit(0);
        }
        process.exit(3);
    }

    const all = services.all || [];
    const running = services.running || [];
    const statuses = (services.statuses || {}) as Record<string, string>;

    // Derive running count from the parsed statuses map to handle states
    // such as "Up", "running", and to correctly treat "not running" as down.
    const runningCount = all.filter((svc) => isRunningState(statuses[svc] || '')).length;

    if (all.length === 0) {
        console.log('No services defined in docker compose file (no services found).');
        const ans = (await prompt('Would you like to run `docker compose up -d` now? (y/N): '))
            .trim()
            .toLowerCase();
        if (ans === 'y' || ans === 'yes') {
            const up = run('docker', ['compose', 'up', '-d']);
            if (up.code !== 0) {
                console.error('Failed to start compose stack:', up.stderr || up.stdout);
                process.exit(4);
            }
            console.log('Compose stack started.');
            process.exit(0);
        }
        // User declined to start compose — exit with non-zero to indicate no action taken
        process.exit(1);
    }

    console.log(`Found ${all.length} service(s) in compose file, ${runningCount} running.`);

    // Print status for each service with icons
    for (const svc of all) {
        const st = statuses[svc] || (running.includes(svc) ? 'running' : 'not running');
        const icon = isRunningState(st) ? '✅' : '❌';
        console.log(` ${icon}  ${svc}: ${st}`);
    }

    if (runningCount === 0) {
        const ans = (await prompt('Start compose stack now? (y/N): ')).trim().toLowerCase();
        if (ans === 'y' || ans === 'yes') {
            const up = run('docker', ['compose', 'up', '-d']);
            if (up.code !== 0) {
                console.error('Failed to start compose stack:', up.stderr || up.stdout);
                process.exit(5);
            }
            console.log('Compose stack started.');
            process.exit(0);
        }
        // User declined to start compose — exit with non-zero to indicate no action taken
        process.exit(1);
    }

    if (runningCount < all.length) {
        console.log('Some services are running while others are not.');
        const ans = (await prompt('Restart the compose stack (docker compose restart) ? (y/N): '))
            .trim()
            .toLowerCase();
        if (ans === 'y' || ans === 'yes') {
            const restart = run('docker', ['compose', 'restart']);
            if (restart.code !== 0) {
                console.error('Failed to restart compose stack:', restart.stderr || restart.stdout);
                process.exit(6);
            }
            console.log('Compose stack restarted.');
            process.exit(0);
        }
        // User declined to restart — exit with non-zero to indicate no action taken
        process.exit(1);
    }

    // all running — we've already printed per-service statuses above,
    // so just print a concise summary and exit successfully.
    console.log('All services are running. ✅');
    process.exit(0);
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(99);
});
