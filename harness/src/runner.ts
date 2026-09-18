import { spawn } from 'node:child_process';
import type { CommandResult } from './types.js';

export function runCommand(
  cwd: string,
  command: string,
  args: string[],
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      const exitCode = code ?? 1;
      resolve({
        success: exitCode === 0,
        exitCode,
        stdout,
        stderr,
        command: [command, ...args].join(' '),
      });
    });
  });
}

export function formatCommandResult(result: CommandResult): string {
  const sections = [
    `command: ${result.command}`,
    `exitCode: ${result.exitCode}`,
    `success: ${result.success}`,
  ];

  if (result.stdout.trim()) {
    sections.push('', 'stdout:', result.stdout.trimEnd());
  }
  if (result.stderr.trim()) {
    sections.push('', 'stderr:', result.stderr.trimEnd());
  }

  return sections.join('\n');
}
