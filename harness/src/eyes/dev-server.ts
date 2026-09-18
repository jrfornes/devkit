import { spawn, type ChildProcess } from 'node:child_process';
import { withHostPath } from '../host-env.js';
import type { DevServerStatus, HarnessConfig } from '../types.js';

let child: ChildProcess | null = null;
let status: DevServerStatus = {
  running: false,
  url: null,
  port: null,
  project: null,
  pid: null,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Server not ready yet.
    }
    await sleep(1000);
  }

  throw new Error(`Dev server did not become ready at ${url} within ${timeoutMs}ms`);
}

function killProcessTree(childProcess: ChildProcess): void {
  const pid = childProcess.pid;
  if (!pid) {
    return;
  }

  try {
    childProcess.kill('SIGTERM');
  } catch {
    // Process may already be gone.
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // Process group kill is best-effort on some platforms.
  }
}

export function getDevServerStatus(): DevServerStatus {
  return { ...status };
}

export async function startDevServer(config: HarnessConfig): Promise<DevServerStatus> {
  if (status.running) {
    return getDevServerStatus();
  }

  const { serveProject, port } = config.profile.devServer;
  const url = config.profile.devServerUrl(port);

  child = spawn(
    'npx',
    ['nx', 'serve', serveProject, `--port=${port}`, '--host=127.0.0.1'],
    {
      cwd: config.workspaceRoot,
      env: withHostPath(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    },
  );

  status = {
    running: true,
    url,
    port,
    project: serveProject,
    pid: child.pid ?? null,
  };

  child.on('exit', () => {
    status = {
      running: false,
      url: null,
      port: null,
      project: null,
      pid: null,
    };
    child = null;
  });

  child.unref();

  try {
    await waitForServer(url);
    return getDevServerStatus();
  } catch (error) {
    await stopDevServer();
    throw error;
  }
}

export async function stopDevServer(): Promise<DevServerStatus> {
  if (child && child.pid) {
    killProcessTree(child);
    await sleep(500);
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      // Already stopped.
    }
  }

  child = null;
  status = {
    running: false,
    url: null,
    port: null,
    project: null,
    pid: null,
  };

  return getDevServerStatus();
}

export async function ensureDevServer(config: HarnessConfig): Promise<string> {
  const current = await startDevServer(config);
  if (!current.url) {
    throw new Error('Dev server failed to start');
  }
  return current.url;
}
