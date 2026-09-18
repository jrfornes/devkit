import fs from 'node:fs';
import path from 'node:path';
import { resolveLocalNx, resolveNpx } from '../host-env.js';
import { runCommand } from '../runner.js';
import type { CommandResult, ProjectProfile } from '../types.js';

const DEV_SERVER_PORT = 4200;

export interface NxAngularProfileOptions {
  name: string;
  serveProject: string;
  port?: number;
  baselinesDir?: string;
  testProjects?: string[];
  buildProjects?: string[];
  lintProjects?: string[];
  defaultBaseBranch?: string;
}

function runNx(workspaceRoot: string, nxArgs: string[]): Promise<CommandResult> {
  const localNx = resolveLocalNx(workspaceRoot);
  if (localNx) {
    return runCommand(workspaceRoot, localNx, nxArgs);
  }

  if (!fs.existsSync(path.join(workspaceRoot, 'package.json'))) {
    return Promise.resolve({
      success: false,
      exitCode: 127,
      stdout: '',
      stderr:
        `No package.json in ${workspaceRoot}. workspaceRoot must be the nx checkout ` +
        `(the directory that contains nx.json / package.json).`,
      command: ['nx', ...nxArgs].join(' '),
    });
  }

  if (!fs.existsSync(path.join(workspaceRoot, 'node_modules'))) {
    return Promise.resolve({
      success: false,
      exitCode: 127,
      stdout: '',
      stderr:
        `node_modules missing in ${workspaceRoot}. Run npm install there, then retry.`,
      command: ['nx', ...nxArgs].join(' '),
    });
  }

  return runCommand(workspaceRoot, resolveNpx(), ['nx', ...nxArgs]);
}

function nxRunMany(workspaceRoot: string, target: string, projects?: string[]) {
  const args = ['run-many', '-t', target, '--skip-nx-cache'];
  if (projects && projects.length > 0) {
    args.push(`--projects=${projects.join(',')}`);
  }
  return runNx(workspaceRoot, args);
}

export function createNxAngularProfile(options: NxAngularProfileOptions): ProjectProfile {
  const port = options.port ?? DEV_SERVER_PORT;
  const baselinesDir = options.baselinesDir ?? 'visual-baselines';
  const buildProjects = options.buildProjects ?? [options.serveProject];
  const lintProjects = options.lintProjects ?? options.testProjects;

  return {
    name: options.name,
    testProjects: options.testProjects,
    buildProjects,
    lintProjects,
    defaultBaseBranch: options.defaultBaseBranch ?? 'main',

    devServer: {
      serveProject: options.serveProject,
      port,
      baselinesDir,
    },

    devServerUrl(devPort = port) {
      return `http://127.0.0.1:${devPort}`;
    },

    routeToBaselineName(route: string) {
      const normalized = route.replace(/^\//, '').replace(/\//g, '__') || 'home';
      return `${normalized}.png`;
    },

    runTests(workspaceRoot, project) {
      if (project) {
        return runNx(workspaceRoot, ['test', project, '--skip-nx-cache']);
      }
      return nxRunMany(workspaceRoot, 'test', options.testProjects);
    },

    lint(workspaceRoot) {
      return nxRunMany(workspaceRoot, 'lint', lintProjects);
    },

    runBuild(workspaceRoot, project) {
      if (project) {
        return runNx(workspaceRoot, ['build', project, '--skip-nx-cache']);
      }
      return nxRunMany(workspaceRoot, 'build', buildProjects);
    },
  };
}

export const nxAngularProfile: ProjectProfile = createNxAngularProfile({
  name: 'nx-angular',
  serveProject: 'demo',
  buildProjects: ['demo'],
});

export function baselinePath(workspaceRoot: string, profile: ProjectProfile, route: string) {
  return path.join(
    workspaceRoot,
    profile.devServer.baselinesDir,
    profile.routeToBaselineName(route),
  );
}
