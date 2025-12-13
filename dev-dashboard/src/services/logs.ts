import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import config from './config';

const LOGS_DIR = join(config.root, 'logs');

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

export function getLogPath(programId: string): string {
  return join(LOGS_DIR, `${programId}.log`);
}

export function readLogs(programId: string, tailLines = 100): string[] {
  const logPath = getLogPath(programId);
  if (!existsSync(logPath)) return [];
  
  try {
    const content = readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.slice(-tailLines);
  } catch {
    return [];
  }
}

export function clearLogs(programId: string): void {
  const logPath = getLogPath(programId);
  if (existsSync(logPath)) {
    writeFileSync(logPath, '');
  }
}
