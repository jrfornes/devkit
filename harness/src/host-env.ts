import fs from 'node:fs';
import path from 'node:path';

const HOST_BIN_DIRS = [
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
];

const PLACEHOLDER_WORKSPACE_MARKERS = [
  '/absolute/path/to/private/repo',
  '/path/to/private/repo',
];

export function nodeBinDir(): string {
  return path.dirname(process.execPath);
}

export function withHostPath(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const existing = env.PATH ?? '';
  const parts = existing.split(path.delimiter).filter(Boolean);
  const prepend = [nodeBinDir(), ...HOST_BIN_DIRS].filter((dir) => !parts.includes(dir));
  return {
    ...env,
    PATH: [...prepend, ...parts].join(path.delimiter),
  };
}

export function applyHostPath(): void {
  process.env.PATH = withHostPath(process.env).PATH;
}

export function resolveNpx(): string {
  const names = process.platform === 'win32' ? ['npx.cmd', 'npx.exe', 'npx'] : ['npx'];
  const searchDirs = [nodeBinDir(), ...HOST_BIN_DIRS];
  for (const dir of searchDirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return 'npx';
}

export function resolveLocalNx(workspaceRoot: string): string | undefined {
  const binDir = path.join(workspaceRoot, 'node_modules', '.bin');
  const names = process.platform === 'win32' ? ['nx.cmd', 'nx.exe', 'nx'] : ['nx'];
  for (const name of names) {
    const candidate = path.join(binDir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export function isPlaceholderToken(value: string): boolean {
  return /<[^>]+>/.test(value);
}

export function isPlaceholderWorkspaceRoot(workspaceRoot: string): boolean {
  const normalized = workspaceRoot.replace(/\\/g, '/');
  return PLACEHOLDER_WORKSPACE_MARKERS.some(
    (marker) => normalized === marker || normalized.endsWith(marker),
  );
}

export function assertWorkspaceReady(workspaceRoot: string): void {
  if (isPlaceholderWorkspaceRoot(workspaceRoot)) {
    throw new Error(
      `workspaceRoot is still the example placeholder: ${workspaceRoot}\n` +
        'Edit harness/profiles/nx-angular-private.local.json and set workspaceRoot to the real ' +
        'clone (the directory that contains nx.json), e.g. /Users/you/src/my-app. ' +
        'Then restart the MCP server.',
    );
  }

  if (!fs.existsSync(workspaceRoot)) {
    throw new Error(
      `workspaceRoot does not exist: ${workspaceRoot}\n` +
        'Set an absolute path to a cloned git repo. Cursor MCP also needs git on PATH — ' +
        'from a terminal run `which git` and add that directory to the MCP env PATH ' +
        '(macOS GUI apps often miss /opt/homebrew/bin).',
    );
  }

  if (!fs.statSync(workspaceRoot).isDirectory()) {
    throw new Error(`workspaceRoot is not a directory: ${workspaceRoot}`);
  }
}

export function assertProfileNamesReady(options: {
  serveProject: string;
  testProjects?: string[];
  buildProjects?: string[];
  lintProjects?: string[];
}): void {
  const names = [
    options.serveProject,
    ...(options.testProjects ?? []),
    ...(options.buildProjects ?? []),
    ...(options.lintProjects ?? []),
  ];
  const placeholders = names.filter(isPlaceholderToken);
  if (placeholders.length === 0) {
    return;
  }

  throw new Error(
    `Profile still has example placeholders: ${placeholders.join(', ')}\n` +
      'In the private checkout run `npx nx show projects` and put the real names in ' +
      'harness/profiles/nx-angular-private.local.json (serveProject, testProjects, buildProjects). ' +
      'Then restart the MCP server.',
  );
}
