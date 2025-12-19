/**
 * Dev Dashboard - Entry point
 * Run: npm start -OR- npx tsx dev-dashboard/dev-dashboard.ts
 */

// import config first so that it loads before other modules
import './services/config';

import { ensureDockerRunning } from './core/docker';
import { startServer } from './services/server';
import { serviceGroups } from './service-agents/service-groups-collection';

// Check Docker is running before starting
ensureDockerRunning();

startServer();

async function startAllServices() {
    const dockerServices = await serviceGroups.docker.services;
    const programServices = await serviceGroups.programs.services;

    dockerServices.forEach(async service => {
        console.log(`Starting docker service: ${service.name}`);
        await service.start();
    });

    programServices.forEach(async service => {
        console.log(`Starting program service: ${service.name}`);
        await service.start();
    });
}

startAllServices();

let shuttingDown = false;
async function cleanShutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('Shutting down services...');
    await Promise.all(Object.entries(serviceGroups).map(async ([name, group]) => {
        console.log(`Shutting down service group: ${name}`);
        await group.shutdown();
    }));
    process.exit(0);
}

if (process.stdin.isTTY && process.stdin.setRawMode) {
    console.log('Press "q" to quit the Dev Dashboard.');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async (buf) => {
        const input = buf.toString().toLowerCase();
        if (input === 'q' || buf[0] === 27 || buf[0] === 3) { // 'q' or ESC key or Ctrl+C
            await cleanShutdown();
        }
    });
}

process.once('SIGINT', async () => {
    console.log('\nShutting down...');
    await cleanShutdown();
});
