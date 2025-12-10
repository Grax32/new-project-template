import { AnsiUp } from 'ansi_up';
import { IncomingMessage, ServerResponse } from 'http';
import { serviceGroups } from '../impl/service-groups-collection';
import { IServiceGroup } from '../interfaces/service-group';

type RouteHandler = (req: IncomingMessage, res: ServerResponse, params?: Record<string, string>) => Promise<void> | void;
const au = new AnsiUp();

function parseQuery(url: string): Record<string, string> {
    const queryString = url.split('?')[1];
    if (!queryString) return {};

    const params: Record<string, string> = {};
    queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        params[key] = decodeURIComponent(value || '');
    });
    return params;
}

function json(res: ServerResponse, data: unknown, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
}

// Service Group Level Routes
export const serviceGroupParamRoutes: Record<string, RouteHandler> = {
    'POST /api/service-groups/:groupName/all/:action': async (req, res, params) => {
        const groupName = params?.groupName;
        const action = params?.action;
        const group: IServiceGroup | undefined = groupName ? serviceGroups[groupName] : undefined;

        if (!group) {
            return json(res, { error: 'Service group not found' }, 404);
        }

        switch (action) {
            case 'start':
                await group.start();
                return json(res, { message: 'Started' });
            case 'stop':
                await group.stop();
                return json(res, { message: 'Stopped' });
            default:
                return json(res, { error: 'Invalid action' }, 400);
        }
    },

    // Individual Service Level Routes
    'POST /api/service-groups/:groupName/services/:serviceId/:action': async (req, res, params) => {
        const groupName = params?.groupName;
        const serviceId = params?.serviceId;
        const action = params?.action;
        const group: IServiceGroup | undefined = groupName ? serviceGroups[groupName] : undefined;

        if (!group) {
            return json(res, { error: 'Service group not found' }, 404);
        }

        const services = await group.services;
        const service = services.find(s => s.id === serviceId);
        if (!service) {
            return json(res, { error: 'Service not found' }, 404);
        }

        switch (action) {
            case 'start':
                await service.start();
                return json(res, { message: 'Started' });
            case 'stop':
                await service.stop();
                return json(res, { message: 'Stopped' });
            case 'restart':
                await service.restart();
                return json(res, { message: 'Restarted' });
            default:
                return json(res, { error: 'Invalid action' }, 400);
        }
    },

    'GET /api/service-groups/:groupName/services/:serviceId/logs': async (req, res, params) => {
        const groupName = params?.groupName;
        const serviceId = params?.serviceId;
        const group: IServiceGroup | undefined = groupName ? serviceGroups[groupName] : undefined;

        if (!group) {
            return json(res, { error: 'Service group not found' }, 404);
        }

        const services = await group.services;
        const service = services.find(s => s.id === serviceId);
        if (!service) {
            return json(res, { error: 'Service not found' }, 404);
        }

        const query = parseQuery(req.url || '');
        const tail = query.tail ? parseInt(query.tail, 10) : undefined;

        const logs = await service.logs(tail);
        const logHtml = au.ansi_to_html(logs);

        json(res, { logHtml });
    },
};

