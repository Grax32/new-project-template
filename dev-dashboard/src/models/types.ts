import { ChildProcess } from 'child_process';

export interface Configuration {
    /* Timestamp when the Dev Dashboard was started */
    startTime: Date;
    /* Root directory of the Solution */
    solutionRoot: string;
    /* Root directory of the project */
    root: string;
    /* Port for the Dev Dashboard server */
    port: number;
    /* Mapping of program identifiers to their configurations */
    programs: Record<string, ProgramConfig>;
}

/**
 * Program configuration and runtime state
 */
export interface ProgramConfig {
    /* Working directory for the program */
    cwd: string;
    /* Human-readable name of the program */
    name: string;
    /* URL or local path to access the service */
    link: string;
    /* Ports that the service opens */
    openPorts: number[];
    /* Command to start the program */
    cmd: string;
    /* Arguments for the command */
    args: string[];
}

export interface Program extends ProgramConfig {
    process?: ChildProcess;
    status: 'stopped' | 'running' | 'error';
}

export interface DockerService {
    name: string;
    status: string;
    ports: string;
}
