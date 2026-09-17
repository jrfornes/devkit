import type { ProjectProfile } from '../types.js';
import { runCommand } from '../runner.js';

export const nxAngularProfile: ProjectProfile = {
  name: 'nx-angular',

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
