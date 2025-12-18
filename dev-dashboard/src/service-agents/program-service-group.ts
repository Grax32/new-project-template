import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { once } from 'events'; 
import treeKill from 'tree-kill';
import { IService, IServiceGroup, IServiceState, ServiceStatus } from '../interfaces/service-group';
import config from '../services/config';
import { getLogPath, readLogs } from '../services/logs';
import { eventBus } from '../services/event-bus';
import { ProgramConfig } from '../models';

export const programServicesserviceGroup = "programs";

function treeKillAsync(pid: number, signal = 'SIGTERM'): Promise<void> {
    return new Promise((resolve, reject) => {
        treeKill(pid, signal, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

class ProgramService implements IService {
    private process?: ChildProcess;
    private currentStatus: ServiceStatus = 'stopped';
    private currentHealth: 'healthy' | 'unhealthy' = 'unhealthy';
    private healthReason = 'not running';

    public get name(): string {
        return this.programConfig.name;
    }

    private get healthCheckPatterns() {
        return this.programConfig.healthCheckPatterns || [];
    }

    constructor(
        public readonly programConfig: ProgramConfig,
        public readonly serviceId: string,
    ) {
        
    }
    config(): Promise<{ name: string; link: string; openPorts: number[]; }> {
        const serviceConfig = config.programs[this.serviceId];
        return Promise.resolve({
            name: serviceConfig.name,
            link: serviceConfig.link,
            openPorts: serviceConfig.openPorts,
        });
    }

    private async emitServiceStatusUpdate() {
        const state = await this.state();

        eventBus.serviceStatusEvents.emit({
            type: 'service-status',
            serviceId: this.serviceId,
            serviceGroup: programServicesserviceGroup,
            status: state.status,
            healthy: state.health.isHealthy,
            healthReason: state.health.reason,
        });
    }

    private async emitLogChange() {
        eventBus.logChangeEvents.emit({
            type: 'log-change',
            serviceId: this.serviceId,
            serviceGroup: programServicesserviceGroup
        });
    }

    async start(): Promise<void> {
        if (this.process) {
            console.log(`Program ${this.name} is already running.`);
            return;
        }

        this.currentStatus = 'starting';
        await this.emitServiceStatusUpdate();

        const { cmd, args, cwd, name } = this.programConfig;

        console.log(`Starting program: ${name}`);
        const logPath = getLogPath(this.serviceId);
        const logFd = fs.createWriteStream(logPath, { flags: 'w' });

        const proc = spawn(cmd, args, {
            cwd: cwd,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        console.log(`Program ${name} started with PID: ${proc.pid}`);
        console.log(`${cwd}> ${cmd} ${args.join(' ')}`);

        proc.stdout.pipe(logFd);
        proc.stderr.pipe(logFd);

        this.process = proc;

        const logChanged = (line: string) => {
            this.emitLogChange();



            const time = new Date().toISOString().split('T')[1].split('Z')[0];
            console.log(`[${time}] ${line.toString().trim()}`);
        }

        proc.stdout?.on('data', logChanged);
        proc.stderr?.on('data', logChanged);

        proc.on('spawn', async () => {
            console.log(`Program ${this.name} is now running.`);
            this.currentStatus = 'running';
            await this.emitServiceStatusUpdate();
        });

        proc.on('error', async (err) => {
            console.log(`Failed to start program ${this.name}:`, err.message);
            this.currentStatus = 'error';
            this.process = undefined;
            await this.emitServiceStatusUpdate();
        });

        proc.on('close', async (code, signal) => {
            // Determine final status based on how the process exited
            if (this.currentStatus === 'killing') {
                // SIGKILL was sent (either by timeout or double-stop)
                console.log(`Program ${this.name} was killed (SIGKILL).`);
                this.currentStatus = 'killed';
            } else if (this.currentStatus === 'stopping') {
                // Clean shutdown via SIGTERM
                console.log(`Program ${this.name} stopped cleanly.`);
                this.currentStatus = 'stopped';
            } else if (code === 0) {
                // Normal exit
                this.currentStatus = 'stopped';
            } else {
                // Crashed or unexpected exit
                console.log(`Program ${this.name} exited with code ${code}, signal ${signal}.`);
                this.currentStatus = 'error';
            }
            this.process = undefined;
            await this.emitServiceStatusUpdate();
        });
    }

    async stop(): Promise<void> {
        if (!this.process) {
            console.log(`Program ${this.name} is not running.`);
            console.log('Current Status:', this.currentStatus);
            return;
        }

        if (this.currentStatus === 'stopping') {
            this.currentStatus = 'killing';
            await this.emitServiceStatusUpdate();

            if (this.process.pid) {
                console.log(`Attempting to kill program ${this.name}.`);
                treeKill(this.process.pid, 'SIGKILL');
            }
            return;
        }

        this.currentStatus = 'stopping';
        await this.emitServiceStatusUpdate();

        // use a local variable to ensure that we have the correct process reference, regardless of any changes to this.process
        const child = this.process;
        const pid = child.pid;

        if (!pid) {
            console.log(`Program ${this.name} has no PID, cannot stop.`);
            return;
        }

        // Kill entire process tree with SIGTERM
        await treeKillAsync(pid, 'SIGTERM');

        // if the process doesn't exit within 30 seconds, force kill it
        const timeout = setTimeout(async () => {
            const shouldKill = child.exitCode == null && (child.signalCode == null || child.signalCode !== 'SIGKILL');
            console.log(`Timeout waiting for program: ${this.name} to stop. ${shouldKill ? 'Forcing kill.' : ''}`);
            if (shouldKill) {
                console.log(`Force killing program: ${this.name} after timeout`);
                this.currentStatus = 'killing';
                await this.emitServiceStatusUpdate();
                await treeKillAsync(pid, 'SIGKILL');
            }
        }, 30_000); // 30 seconds

        child.on('close', () => clearTimeout(timeout));

        // wait for process to exit
        await once(child, 'exit');
    }

    async restart(): Promise<void> {
        await this.stop();

        const isStopped = () => {
            return this.currentStatus === 'stopped' || this.currentStatus === 'killed' || this.currentStatus === 'error';
        };

        // loop until the process is fully stopped.  give up after 45 seconds (30 second stop timeout + 15 seconds buffer)
        while (!isStopped()) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!isStopped()) {
            console.log(`Failed to stop program ${this.name} for restart.`);
            this.currentStatus = 'error';
            return;
        }

        await this.start();
    }

    async status(): Promise<ServiceStatus> {
        return this.currentStatus;
    }

    async state(): Promise<IServiceState> {
        return {
            serviceId: this.serviceId,
            name: this.name,
            status: this.currentStatus,
            health: { isHealthy: this.currentStatus === 'running', reason: this.currentStatus },
        };
    }

    async logs(tail?: number): Promise<string> {
        const logLines = readLogs(this.serviceId);
        if (tail !== undefined && tail > 0) {
            return logLines.slice(-tail).join('\n');
        }
        return logLines.join('\n');
    }

}

class ProgramServiceGroup implements IServiceGroup {

    private readonly programServices = this.loadServices();
    public readonly services = Promise.resolve(this.programServices);

    constructor(public readonly name: string) {
    }

    private loadServices(): ProgramService[] {
        if (this.programServices) {
            throw new Error('Services have already been loaded.');
        }

        const { programs: programsConfig } = config;

        const result = Object.entries(programsConfig).map(([id, cfg]) => new ProgramService(
            cfg,
            id
        ));
        return result;
    }

    async start(): Promise<void> {
        await Promise.all(this.programServices.map(s => s.start()));
    }

    async stop(): Promise<void> {
        await Promise.all(this.programServices.map(s => s.stop()));
    }

    async state(): Promise<Record<string, IServiceState>> {
        const result: Record<string, IServiceState> = {};

        const services = await this.services;

        for (const service of services) {
            result[service.programConfig.name] = await service.state();
        }

        return result;
    }

    async shutdown(): Promise<void> {
        console.log(`Shutting down program service group: ${this.name}`);
        await this.stop();
    }

}

export const programsServiceCollection: IServiceGroup = new ProgramServiceGroup('programs');
