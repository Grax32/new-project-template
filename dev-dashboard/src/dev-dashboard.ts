/**
 * Dev Dashboard - Entry point
 * Run: npm start -OR- npx tsx dev-dashboard/dev-dashboard.ts
 */

// import config first so that it loads before other modules
import './config';

import { ensureDockerRunning } from './library/docker';
import { startServer } from './server';
import { serviceGroups } from './impl/service-groups-collection';

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

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    Object.entries(serviceGroups).forEach(([name, group]) => {
        console.log(`Shutting down service group: ${name}`);
        group.shutdown();
    });
    process.exit(0);
});
