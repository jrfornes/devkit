import { spawn } from 'node:child_process';
import { resolveNpx, withHostPath } from './host-env.js';
import type { CommandResult } from './types.js';

export function runCommand(
  cwd: string,
  command: string,
  args: string[],
): Promise<CommandResult> {
  const resolvedCommand = command === 'npx' ? resolveNpx() : command;
  const displayCommand = [resolvedCommand, ...args].join(' ');

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CommandResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const child = spawn(resolvedCommand, args, {
      cwd,
      env: withHostPath(),
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      finish({
        success: false,
        exitCode: 127,
        stdout,
        stderr:
          `${message}\n` +
          `Failed to spawn ${resolvedCommand}. Cursor MCP often has a stripped PATH.\n` +
          `Node bin dir should be on PATH (${process.execPath}). ` +
          `If this is npx/nx, run npm install in the target workspace and restart MCP.`,
        command: displayCommand,
      });
    });

    child.on('close', (code) => {
      const exitCode = code ?? 1;
      finish({
        success: exitCode === 0,
        exitCode,
        stdout,
        stderr,
        command: displayCommand,
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
