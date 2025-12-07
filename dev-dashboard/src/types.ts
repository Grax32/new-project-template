import { ChildProcess } from 'child_process';

export interface Configuration {
    solutionRoot: string;
    root: string;
    port: number;
    maxLogs: number;
    programs: Record<string, ProgramConfig>;
}

export interface ProgramConfig {
    name: string;
    cmd: string;
    args: string[];
}

export interface Program extends ProgramConfig {
    cwd: string;
    process?: ChildProcess;
    status: 'stopped' | 'running' | 'error';
}

export interface DockerService {
    name: string;
    status: string;
    ports: string;
}
