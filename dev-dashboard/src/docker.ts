import config from './config';
import { execSync } from 'child_process';
import { DockerService } from './types';
import { getErrorString } from './handle-error';

const ROOT = config.root;

export function getConfiguredServices(): string[] {
  try {
    const out = execSync('docker compose config --services', { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
    return out.trim().split('\n').filter(Boolean).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function dockerPs(): DockerService[] {
  try {
    const configured = getConfiguredServices();
    const out = execSync('docker compose ps -a --format json', { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
    const running = new Map<string, { status: string; ports: string }>();

    out
      .trim()
      .split('\n')
      .filter(Boolean)
      .forEach((line) => {
        const c = JSON.parse(line);
        const name = c.Service || c.Name;
        running.set(name, { status: c.State || c.Status || 'unknown', ports: c.Ports || '' });
      });

    return configured.map((name) => {
      const info = running.get(name);
      return {
        name,
        status: info?.status || 'stopped',
        ports: info?.ports || '',
      };
    });
  } catch {
    return getConfiguredServices().map((name) => ({ name, status: 'stopped', ports: '' }));
  }
}

export function dockerCmd(action: 'up' | 'down' | 'start' | 'stop' | 'restart', service?: string): string {
  const svc = service ? ` ${service}` : '';
  const cmd = action === 'start' ? `docker compose up -d${svc}` : `docker compose ${action}${svc}`;
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  } catch (e) {
    return getErrorString(e);
  }
}

export function dockerLogs(service: string, tail = 100): string[] {
  try {
    const out = execSync(`docker compose logs --tail=${tail} ${service}`, { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}
