#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = resolve(__dirname, '../dist/index.js');

// Handle version and help flags directly
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const child = spawn('node', [serverPath, '--version'], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code));
  process.exit(0);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  const child = spawn('node', [serverPath, '--help'], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code));
  process.exit(0);
}

// No browser installation needed - handled by postinstall script

// Spawn the actual server process
const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  detached: false
});

// Forward signals to child process
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

// Exit with same code as child
child.on('exit', (code) => {
  process.exit(code);
});