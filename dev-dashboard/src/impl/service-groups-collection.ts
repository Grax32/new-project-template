import { IService, IServiceGroup } from "../interfaces/service-group";
import { dockerServices } from "./docker-compose-service-group";
import { programsServiceGroup } from "./program-service-group";

export const serviceGroups = {
    docker: dockerServices,
    programs: programsServiceGroup,
} as const;

export async function getService(groupName: string, serviceId: string) {
    const group: IServiceGroup = serviceGroups[groupName];
    if (!group) {
        return undefined;
    }
    const services = await group.services;
    const service = services.find(s => s.id === serviceId);
    return service || undefined;
}

export async function getAllServices(): Promise<Array<{ groupName: string; service: IService; }>> {
    const allServices: Array<{ groupName: string; service: IService; }> = [];
    for (const [groupName, group] of Object.entries(serviceGroups)) {
        const services = await group.services;
        for (const service of services) {
            allServices.push({ groupName, service });
        }
    }
    return allServices;
}