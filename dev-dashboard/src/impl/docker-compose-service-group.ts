import config from '../config';
import { Lazy } from '../functions';
import { IService, IServiceGroup as IServiceGroup, ServiceStatus } from '../interfaces/service-group';
import { emitSSEUpdate, emitLogChange } from '../routes/sse-routes';
import { exec } from 'child_process';
import utility from 'util';

// Wrapper to exec a command in an async/await friendly way
// Using exec since docker compose commands are generally short-lived
export const executeCommand = utility.promisify(exec);

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

    constructor(
        public readonly id: string,
        public readonly name: string,
        private readonly projectRoot: string
    ) {

        // we're not watching the logs for changes directly, so we'll update every 30 seconds
        const intervalLogChange = () => {
            emitLogChange(id);
        };

        setInterval(intervalLogChange, logChangeIntervalMs);
    }

    setStatusOverride(overrideStatus: ServiceStatus | null) {
        this.statusOverride = overrideStatus;
        emitSSEUpdate();
    }

    async start(): Promise<void> {
        try {
            this.statusOverride = 'starting';
            emitSSEUpdate();
            await executeCommand(`docker compose up -d ${this.name}`, {
                cwd: this.projectRoot,
                timeout: 60000,
            });
        } finally {
            this.statusOverride = null;
            emitSSEUpdate();
        }
    }

    async stop(): Promise<void> {
        try {
            this.statusOverride = 'stopping';
            emitSSEUpdate();
            await executeCommand(`docker compose stop ${this.name}`, {
                cwd: this.projectRoot,
                timeout: 60000,
            });
        } finally {
            this.statusOverride = null;
            emitSSEUpdate();
        }
    }

    async restart(): Promise<void> {
        try {
            this.statusOverride = 'restarting';
            emitSSEUpdate();
            await executeCommand(`docker compose restart ${this.name}`, {
                cwd: this.projectRoot,
                timeout: 60000,
            });
        } finally {
            this.statusOverride = null;
            emitSSEUpdate();
        }
    }

    async status(): Promise<ServiceStatus> {
        if (this.statusOverride) {
            return this.statusOverride;
        }

        try {
            const out = await executeCommand(`docker compose ps -a --format json`, {
                cwd: this.projectRoot,
                timeout: 10000,
            });

            const containers = out
                .stdout
                .trim()
                .split('\n')
                .filter(Boolean)
                .map(line => JSON.parse(line));

            const container = containers.find(c => (c.Service || c.Name) === this.name);
            const rawStatus = container ? (container.State || container.Status) : null;
            return this.normalizeStatus(rawStatus);
        } catch {
            return 'unknown';
        }
    }

    private normalizeStatus(rawStatus: string | null): ServiceStatus {
        if (!rawStatus) return 'stopped';
        const lower = rawStatus.toLowerCase();
        const mappedStatus = statusMappingLookupMap[lower] || 'unknown';
        return mappedStatus;
    }

    async logs(tail = 100): Promise<string> {
        try {
            const result = await executeCommand(`docker compose logs --since=${config.startTime.toISOString()} --tail=${tail} ${this.name}`, {
                cwd: this.projectRoot,
                encoding: 'utf8',
                timeout: 30000,
            });

            const formatter = new Intl.DateTimeFormat('en-US', {
                dateStyle: 'short',
                timeStyle: 'short'
            });

            const startTimeStr = formatter.format(config.startTime);

            const output = `Log entries prior to start time of ${startTimeStr} can be viewed in the Docker UI or
with the following command:  docker compose logs ${this.name}
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
        private readonly projectRoot: string
    ) { }
    shutdown(): Promise<void> {
        console.log(`Shutting down service group: ${this.name}.  Leaving containers as-is.`);
        // No specific shutdown logic for docker-compose
        // We leave the containers in whatever state they are in
        return Promise.resolve();
    }

    private async discoverServices(): Promise<DockerComposeService[]> {
        try {
            const out = await executeCommand('docker compose config --services', {
                cwd: this.projectRoot,
                encoding: 'utf8',
                timeout: 10000,
            });

            return out
                .stdout
                .trim()
                .split('\n')
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
                .map(name => new DockerComposeService(name, name, this.projectRoot));
        } catch {
            console.error('Failed to discover docker compose services');
            return [];
        }
    }

    async start(): Promise<void> {
        const services = await this.dockerServices;
        services.forEach(s => s.setStatusOverride('starting'));
        await executeCommand('docker compose up -d', {
            cwd: this.projectRoot,
            encoding: 'utf8',
            timeout: 60000,
        });
        services.forEach(s => s.setStatusOverride(null));
        emitSSEUpdate();
    }

    async stop(): Promise<void> {
        const services = await this.dockerServices;
        services.forEach(s => s.setStatusOverride('stopping'));
        await executeCommand('docker compose down', {
            cwd: this.projectRoot,
            encoding: 'utf8',
            timeout: 60000,
        });
        services.forEach(s => s.setStatusOverride(null));
        emitSSEUpdate();
    }

    async status(): Promise<Record<string, ServiceStatus>> {
        const result: Record<string, ServiceStatus> = {};

        const services = await this.services;

        for (const service of services) {
            result[service.name] = await service.status();
        }

        return result;
    }
}

export const dockerServices: IServiceGroup = new DockerComposeServiceGroup('docker-compose', __dirname);
