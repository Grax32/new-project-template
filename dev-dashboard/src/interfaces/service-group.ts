export type ServiceStatus =
    | 'restarting'
    | 'killing'
    | 'killed'
    | 'starting'
    | 'stopping'
    | 'stopped'
    | 'running'
    | 'error'
    | 'paused'
    | 'unknown';

export interface IServiceState {
    serviceId: string;
    name: string;
    status: ServiceStatus;
    health: { isHealthy: boolean; reason: string; };
}

export interface IService {
    serviceId: string;
    name: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    logs(tail?: number): Promise<string>;

    state(): Promise<IServiceState>;
    config(): Promise<{
        name: string;
        link: string;
        openPorts: number[];
    }>;
}

export interface IServiceGroup {
    name: string;
    services: Promise<IService[]>;
    start(): Promise<void>;
    stop(): Promise<void>;
    state(): Promise<Record<string, IServiceState>>;
    shutdown(): Promise<void>;
}
