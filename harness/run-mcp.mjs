#!/usr/bin/env node
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const harnessDir = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(harnessDir, 'src/index.ts');
const tsxCli = path.join(harnessDir, 'node_modules/tsx/dist/cli.mjs');

if (!fs.existsSync(tsxCli)) {
  console.error(
    `tsx not found at ${tsxCli}.\nRun: cd ${harnessDir} && npm install`,
  );
  process.exit(1);
}

if (!fs.existsSync(entry)) {
  console.error(`Harness entry not found: ${entry}`);
  process.exit(1);
}

const extras = [
  path.dirname(process.execPath),
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
];
const pathParts = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
process.env.PATH = [...extras.filter((dir) => !pathParts.includes(dir)), ...pathParts].join(
  path.delimiter,
);

const child = spawn(process.execPath, [tsxCli, entry, ...process.argv.slice(2)], {
  cwd: harnessDir,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
