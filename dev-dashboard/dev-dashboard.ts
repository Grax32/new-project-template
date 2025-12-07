/**
 * Dev Dashboard - Entry point
 * Run: npx tsx dev-dashboard/dev-dashboard.ts
 */

// import config first so that it loads before other modules
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import _ from './src/config';

import { startServer } from './src/server';
import { stopProgram, programs } from './src/programs';

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  Object.keys(programs).forEach(stopProgram);
  process.exit(0);
});
