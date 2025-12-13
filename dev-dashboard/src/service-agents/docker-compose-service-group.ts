import config from '../services/config';
import { Lazy } from '../shared/functions';
import { DockerInspectContainer, DockerPsContainer } from '../interfaces/docker-types';
import { IService, IServiceGroup as IServiceGroup, IServiceState, ServiceStatus } from '../interfaces/service-group';
import { exec } from 'child_process';
import utility from 'util';
import { eventBus } from '../services/event-bus';

export const dockerServicesserviceGroup = "docker";

// Wrapper to exec a command in an async/await friendly way
// Using exec since docker compose commands are generally short-lived
export const executeCommand = utility.promisify(exec);

function executeDockerCommand(command: string) {
    const fullCommand = `docker ${command}`;
    return executeCommand(fullCommand, {
        encoding: 'utf8',
        cwd: config.root,
        timeout: 30000,
    });
}

// Get the status of one or all docker compose services
async function getDockerComposePs(): Promise<DockerPsContainer[]> {
    const result = await executeDockerCommand('compose ps --all --format json');

    const containers = result.stdout.split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .map<DockerPsContainer>((obj) => {
            // map labels from string to object
            if (obj.Labels && typeof obj.Labels === 'string') {
                const labelsObj: Record<string, string> = {};
                obj.Labels.split(',').forEach((labelPair: string) => {
                    const [key, value] = labelPair.split('=');
                    labelsObj[key] = value;
                });
                obj.Labels = labelsObj;
            }
            return obj;
        });

    return containers;
}

async function getDockerComposeInspect(serviceName: string): Promise<DockerInspectContainer> {
    const dockerPs = await getDockerComposePs();
    const containerInfo = dockerPs.find(c => c.Service === serviceName);
    if (!containerInfo) {
        throw new Error(`Cannot find container info for service: ${serviceName}`);
    }
    const result = await executeDockerCommand(`inspect ${containerInfo.ID}`);
    const inspectData = JSON.parse(result.stdout);
    return inspectData[0];
}

// we're not watching the logs for changes directly, so we'll update every 30 seconds
const logChangeIntervalMs = 30_000;

const statusMappingDefinition = [
    { primary: 'running', alternates: ['up'] },
    { primary: 'stopped', alternates: ['exited'] },
    { primary: 'error', alternates: ['dead', 'unhealthy', 'oomkilled'] },
    { primary: 'pending', alternates: ['creating', 'created', 'removing'] },
    { primary: 'restarting', alternates: [] },
    { primary: 'paused', alternates: ['pause'] },
];

// re-shape the above data into a lookup map
const statusMappingLookupMap: Record<string, ServiceStatus> = Object.fromEntries(
    [
        ...statusMappingDefinition.map(s => s.primary).map(p => [p, p]),
        ...statusMappingDefinition.flatMap(s => s.alternates).map(a => [a, statusMappingDefinition.find(s => s.alternates.includes(a))?.primary]),
    ]
);

class DockerComposeService implements IService {

    private statusOverride: ServiceStatus | null = null;

    private details: DockerInspectContainer | null = null;

    public name: string = this.serviceId;

    constructor(
        public readonly serviceId: string,
    ) {

        if (!serviceId) {
            throw new Error('DockerComposeService requires a serviceId.  This will be a docker compose service name.');
        }

        // we're not watching the logs for changes directly, so we'll update every 30 seconds
        const intervalLogChange = () => eventBus.logChangeEvents.emit({
            type: 'log-change',
            serviceId: this.serviceId,
            serviceGroup: dockerServicesserviceGroup
        });

        setInterval(intervalLogChange, logChangeIntervalMs);
    }
    config(): Promise<{ name: string; link: string; openPorts: number[]; }> {
        const openPorts = this.details?.NetworkSettings.Ports
            ? Object.values(this.details.NetworkSettings.Ports)
                .flat()
                .filter(Boolean)
                .map(binding => parseInt(binding.HostPort, 10))
            : [];

        return Promise.resolve({
            name: this.serviceId,
            link: '',
            openPorts,
        });
    }

    private async emitServiceStatusUpdate() {
        const state = await this.state();

        eventBus.serviceStatusEvents.emit({
            type: 'service-status',
            serviceId: this.serviceId,
            serviceGroup: dockerServicesserviceGroup,
            status: state.status,
            healthy: state.health.isHealthy,
            healthReason: state.health.reason,
        });
    }

    /**
     * Set (or clear) a status override and then emit a status update
     * @param overrideStatus 
     */
    async setStatusOverride(overrideStatus: ServiceStatus | null) {
        this.statusOverride = overrideStatus;
        await this.emitServiceStatusUpdate();
    }

    async start(): Promise<void> {
        try {
            this.statusOverride = 'starting';
            await this.emitServiceStatusUpdate();
            await executeDockerCommand(`compose up -d ${this.serviceId}`);
            this.details = await getDockerComposeInspect(this.serviceId);
        } finally {
            this.statusOverride = null;
            await this.emitServiceStatusUpdate();
        }
    }

    async stop(): Promise<void> {
        try {
            this.statusOverride = 'stopping';
            await this.emitServiceStatusUpdate();
            await executeDockerCommand(`compose stop ${this.serviceId}`);
        } finally {
            this.statusOverride = null;
            await this.emitServiceStatusUpdate();
        }
    }

    async restart(): Promise<void> {
        try {
            this.statusOverride = 'restarting';
            await this.emitServiceStatusUpdate();

            await executeDockerCommand(`compose restart ${this.serviceId}`);
        } finally {
            this.statusOverride = null;
            await this.emitServiceStatusUpdate();
        }
    }

    async state(): Promise<IServiceState> {

        const dockerPs = await getDockerComposePs();
        const container = dockerPs.find(c => c.Service === this.serviceId);

        const status = this.statusOverride ? this.statusOverride : this.normalizeStatus(container ? container.State : null);

        if (container && container.Health) {
            return {
                serviceId: this.serviceId,
                name: this.serviceId,
                status,
                health: {
                    isHealthy: container.Health.toLowerCase() === 'healthy',
                    reason: container.Health
                }
            };
        }

        console.log(`No health information available for service: ${this.serviceId}`);

        return {
            serviceId: this.serviceId,
            name: this.serviceId,
            status,
            health: {
                isHealthy: false,
                reason: 'Unknown'
            },
        };
    }

    private normalizeStatus(rawStatus: string | null): ServiceStatus {
        if (!rawStatus) return 'stopped';
        const lower = rawStatus.toLowerCase();
        const mappedStatus = statusMappingLookupMap[lower] || 'unknown';
        return mappedStatus;
    }

    async logs(tail = 100): Promise<string> {
        try {
            const result = await executeDockerCommand(`compose logs --since=${config.startTime.toISOString()} --tail=${tail} ${this.serviceId}`);

            const formatter = new Intl.DateTimeFormat('en-US', {
                dateStyle: 'short',
                timeStyle: 'short'
            });

            const startTimeStr = formatter.format(config.startTime);

            const output = `Log entries prior to start time of ${startTimeStr} can be viewed in the Docker UI or
with the following command:  docker compose logs ${this.serviceId}
Output updates every ${logChangeIntervalMs / 1000} seconds.

` + result.stdout;
            return output;
        } catch {
            return '';
        }
    }
}

class DockerComposeServiceGroup implements IServiceGroup {
    private readonly dockerServices: Promise<DockerComposeService[]> = new Lazy(() => this.discoverServices()).value;
    public readonly services: Promise<IService[]> = this.dockerServices;

    constructor(
        public readonly name: string,
    ) { }
    shutdown(): Promise<void> {
        console.log(`Shutting down docker service group: ${this.name}.  Leaving containers as-is.`);
        // No specific shutdown logic for docker-compose
        // We leave the containers in whatever state they are in
        return Promise.resolve();
    }

    private async discoverServices(): Promise<DockerComposeService[]> {
        try {
            const configServices = await executeDockerCommand('compose config --services');

            const services = configServices
                .stdout
                .trim()
                .split('\n')
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b));

            return services.map(shortName => new DockerComposeService(shortName));

        } catch (error) {
            console.error('Failed to discover docker compose services', error);
            return [];
        }
    }

    async start(): Promise<void> {
        await this.setStatusOverrideForAllServices('starting');
        await executeDockerCommand('compose up -d');
        await this.setStatusOverrideForAllServices(null);
    }

    async stop(): Promise<void> {
        await this.setStatusOverrideForAllServices('stopping');
        await executeDockerCommand('compose down');
        await this.setStatusOverrideForAllServices(null);
    }

    async state(): Promise<Record<string, IServiceState>> {
        const result: Record<string, IServiceState> = {};

        const services = await this.services;

        for (const service of services) {
            result[service.name] = await service.state();
        }

        return result;
    }

    private async setStatusOverrideForAllServices(overrideStatus: ServiceStatus | null) {
        const services = await this.dockerServices;
        await Promise.all(services.map(s => s.setStatusOverride(overrideStatus)));
    }
}

export const dockerServiceCollection: IServiceGroup = new DockerComposeServiceGroup('docker-compose');
