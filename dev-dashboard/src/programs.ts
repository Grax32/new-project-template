import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { Program } from './types';
import config from './config';
import { appendLog, clearLogs } from './logs';

export const events = new EventEmitter();

const { solutionRoot } = config;

// Initialize programs from config
const programsConfig = config.programs;
export const programs: Record<string, Program> = {};

for (const [id, cfg] of Object.entries(programsConfig)) {
  programs[id] = {
    ...cfg,
    cwd: solutionRoot,
    status: 'stopped',
  };
}

export function startProgram(id: string): boolean {
  const p = programs[id];
  if (!p || p.process) return false;

  const proc = spawn(p.cmd, p.args, { cwd: p.cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  p.process = proc;
  p.status = 'running';
  clearLogs(id);

  const pushLog = (data: Buffer) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        appendLog(id, line);
        events.emit('log', id);
      }
    }
  };

  proc.stdout?.on('data', pushLog);
  proc.stderr?.on('data', pushLog);

  proc.on('close', (code) => {
    p.status = code === 0 ? 'stopped' : 'error';
    p.process = undefined;
    events.emit('status', id);
  });

  return true;
}

export function stopProgram(id: string): boolean {
  const p = programs[id];
  if (!p?.process) return false;
  p.process.kill('SIGTERM');
  p.status = 'stopped';
  p.process = undefined;
  return true;
}

export function getProgramStatus() {
  return Object.entries(programs).map(([id, p]) => ({
    id,
    name: p.name,
    status: p.status,
  }));
}
