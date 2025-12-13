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

function cleanShutdown() {
    console.log('Shutting down services...');
    Object.entries(serviceGroups).forEach(([name, group]) => {
        console.log(`Shutting down service group: ${name}`);
        group.shutdown();
    });
    process.exit(0);
}

if (process.stdin.isTTY && process.stdin.setRawMode) {
    console.log('Press "q" to quit the Dev Dashboard.');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (buf) => {
        const input = buf.toString().toLowerCase();
        if (input === 'q' || buf[0] === 27 || buf[0] === 3) { // 'q' or ESC key or Ctrl+C
            cleanShutdown();
        }
    });
}

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    cleanShutdown();
});
