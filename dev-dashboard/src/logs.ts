import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import config from './config';

const LOGS_DIR = join(config.root, 'logs');
const MAX_LOG_SIZE = 1024 * 1024; // 1MB per log file

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

function getLogPath(programId: string): string {
  return join(LOGS_DIR, `${programId}.log`);
}

export function appendLog(programId: string, line: string): void {
  const logPath = getLogPath(programId);
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${line}\n`;
  
  // Rotate if too large
  if (existsSync(logPath)) {
    const stats = require('fs').statSync(logPath);
    if (stats.size > MAX_LOG_SIZE) {
      writeFileSync(logPath, entry);
      return;
    }
  }
  
  appendFileSync(logPath, entry);
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
