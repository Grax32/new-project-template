import { IService, IServiceGroup } from "../interfaces/service-group";
import { ConfiguredService } from "../models/configured-service";
import config from "../services/config";
import { dockerServiceCollection, dockerServicesserviceGroup } from './docker-compose-service-group';
import { programsServiceCollection, programServicesserviceGroup } from "./program-service-group";


export const serviceGroups = {
    [dockerServicesserviceGroup]: dockerServiceCollection,
    [programServicesserviceGroup]: programsServiceCollection,
} as const;

export async function getService(serviceGroup: string, serviceId: string) {
    const group: IServiceGroup = serviceGroups[serviceGroup];
    if (!group) {
        return undefined;
    }
    const services = await group.services;
    const service = services.find(s => s.serviceId === serviceId);
    return service || undefined;
}

export async function getAllServices(): Promise<Array<{ serviceGroup: string; service: IService; }>> {
    const allServices: Array<{ serviceGroup: string; service: IService; }> = [];
    for (const [serviceGroup, group] of Object.entries(serviceGroups)) {
        const services = await group.services;
        for (const service of services) {
            allServices.push({ serviceGroup, service });
        }
    }
    return allServices;
}

export async function getConfiguredServices(): Promise<ConfiguredService[]> {

    const dockerServices = await dockerServiceCollection.services;
    const programServices = Object.entries(config.programs);

    const configuredProgramServices = programServices.map(([serviceId, s]) => ({
        serviceGroup: programServicesserviceGroup,
        serviceId,
        serviceName: s.name,
        link: s.link,
        openPorts: s.openPorts,
    }));

    const configuredDockerServices: ConfiguredService[] = dockerServices.map(s => {
        return {
            serviceGroup: dockerServicesserviceGroup,
            serviceId: s.serviceId,
            serviceName: s.name,
            link: '',
            openPorts: [-99],
        };
    });

    return [
        ...configuredDockerServices,
        ...configuredProgramServices
    ];
}