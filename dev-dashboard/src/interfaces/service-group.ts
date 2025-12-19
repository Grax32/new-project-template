import { ServiceState } from "../models";

export interface IService {
    serviceId: string;
    name: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    logs(tail?: number): Promise<string>;

    state(): Promise<ServiceState>;
    checkForStateChange(force?: boolean): Promise<void>;
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
    state(): Promise<Record<string, ServiceState>>;
    shutdown(): Promise<void>;
}
