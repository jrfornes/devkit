import path from 'node:path';
import type { ProjectProfile } from '../types.js';
import { runCommand } from '../runner.js';

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

function nxRunMany(workspaceRoot: string, target: string, projects?: string[]) {
  const args = ['nx', 'run-many', '-t', target, '--skip-nx-cache'];
  if (projects && projects.length > 0) {
    args.push(`--projects=${projects.join(',')}`);
  }
  return runCommand(workspaceRoot, 'npx', args);
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
        return runCommand(workspaceRoot, 'npx', ['nx', 'test', project, '--skip-nx-cache']);
      }
      return nxRunMany(workspaceRoot, 'test', options.testProjects);
    },

    lint(workspaceRoot) {
      return nxRunMany(workspaceRoot, 'lint', lintProjects);
    },

    runBuild(workspaceRoot, project) {
      if (project) {
        return runCommand(workspaceRoot, 'npx', ['nx', 'build', project, '--skip-nx-cache']);
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
