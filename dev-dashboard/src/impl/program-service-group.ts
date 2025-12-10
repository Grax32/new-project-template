import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import treeKill from 'tree-kill';
import { IService, IServiceGroup, ServiceStatus } from '../interfaces/service-group';
import config from '../config';
import { getLogPath, readLogs } from '../logs';
import { emitSSEUpdate, emitLogChange } from '../routes/sse-routes';

class ProgramService implements IService {
    private process?: ChildProcess;
    private currentStatus: ServiceStatus = 'stopped';

    public logVersion = 0;

    constructor(
        public readonly name: string,
        public readonly id: string,
        private readonly cmd: string,
        private readonly args: string[],
        private readonly cwd: string
    ) {
     }

    async start(): Promise<void> {
        if (this.process) {
            console.log(`Program ${this.name} is already running.`);
            return;
        }

        this.currentStatus = 'starting';
        emitSSEUpdate();

        console.log(`Starting program: ${this.name}`);
        const logPath = getLogPath(this.id);
        const logFd = fs.createWriteStream(logPath, { flags: 'w' });

        const proc = spawn(this.cmd, this.args, {
            cwd: this.cwd,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        proc.stdout.pipe(logFd);
        proc.stderr.pipe(logFd);

        this.process = proc;

        const logChanged = () => {
            this.logVersion++;
            emitLogChange(this.id);
        };

        proc.stdout?.on('data', logChanged);
        proc.stderr?.on('data', logChanged);

        proc.on('spawn', async () => {
            console.log(`Program ${this.name} is now running.`);
            this.currentStatus = 'running';
            emitSSEUpdate();
        });

        proc.on('error', async (err) => {
            console.log(`Failed to start program ${this.name}:`, err.message);
            this.currentStatus = 'error';
            this.process = undefined;
            emitSSEUpdate();
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
            emitSSEUpdate();
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
            emitSSEUpdate();
            if (this.process.pid) {
                console.log(`Attempting to kill program ${this.name}.`);
                treeKill(this.process.pid, 'SIGKILL');
            }
            return;
        }

        this.currentStatus = 'stopping';
        emitSSEUpdate();

        // use a local variable to ensure that we have the correct process reference, regardless of any changes to this.process
        const child = this.process;
        const pid = child.pid;

        if (!pid) {
            console.log(`Program ${this.name} has no PID, cannot stop.`);
            return;
        }

        // Kill entire process tree with SIGTERM
        treeKill(pid, 'SIGTERM');

        // if the process doesn't exit within 30 seconds, force kill it
        const timeout = setTimeout(async () => {
            const shouldKill = child.exitCode == null && (child.signalCode == null || child.signalCode !== 'SIGKILL');
            console.log(`Timeout waiting for program: ${this.name} to stop. ${shouldKill ? 'Forcing kill.' : ''}`);
            if (shouldKill) {
                console.log(`Force killing program: ${this.name} after timeout`);
                this.currentStatus = 'killing';
                emitSSEUpdate();
                treeKill(pid, 'SIGKILL');
            }
        }, 30_000); // 30 seconds

        child.on('close', () => clearTimeout(timeout));
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

    async logs(tail?: number): Promise<string> {
        const logLines = readLogs(this.id);
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

        const { solutionRoot, programs: programsConfig } = config;

        const result = Object.entries(programsConfig).map(([id, cfg]) => new ProgramService(cfg.name, id, cfg.cmd, cfg.args, solutionRoot));
        return result;
    }

    async start(): Promise<void> {
        await Promise.all(this.programServices.map(s => s.start()));
        emitSSEUpdate();
    }

    async stop(): Promise<void> {
        await Promise.all(this.programServices.map(s => s.stop()));
        emitSSEUpdate();
    }

    async status(): Promise<Record<string, ServiceStatus>> {
        const result: Record<string, ServiceStatus> = {};

        for (const service of this.programServices) {
            result[service.id] = await service.status();
        }

        return result;
    }

    async shutdown(): Promise<void> {
        console.log(`Shutting down program service group: ${this.name}`);
        await this.stop();
    }

}

export const programsServiceGroup: IServiceGroup = new ProgramServiceGroup('programs');
