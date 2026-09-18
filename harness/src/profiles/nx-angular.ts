import path from 'node:path';
import type { ProjectProfile } from '../types.js';
import { runCommand } from '../runner.js';

const DEV_SERVER_PORT = 4200;

export const nxAngularProfile: ProjectProfile = {
  name: 'nx-angular',

  devServer: {
    serveProject: 'demo',
    port: DEV_SERVER_PORT,
    baselinesDir: 'visual-baselines',
  },

  devServerUrl(port = DEV_SERVER_PORT) {
    return `http://127.0.0.1:${port}`;
  },

  routeToBaselineName(route: string) {
    const normalized = route.replace(/^\//, '').replace(/\//g, '__') || 'home';
    return `${normalized}.png`;
  },

  runTests(workspaceRoot, project) {
    const args = project
      ? ['nx', 'test', project, '--skip-nx-cache']
      : ['nx', 'run-many', '-t', 'test', '--skip-nx-cache'];
    return runCommand(workspaceRoot, 'npx', args);
  },

  lint(workspaceRoot) {
    return runCommand(workspaceRoot, 'npx', [
      'nx',
      'run-many',
      '-t',
      'lint',
      '--skip-nx-cache',
    ]);
  },
};

export function baselinePath(workspaceRoot: string, profile: ProjectProfile, route: string) {
  return path.join(
    workspaceRoot,
    profile.devServer.baselinesDir,
    profile.routeToBaselineName(route),
  );
}
