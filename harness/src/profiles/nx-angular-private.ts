import type { ProjectProfile } from '../types.js';
import type { ProfileConfigFile } from './load-profile-config.js';
import { createNxAngularProfile } from './nx-angular.js';

export function createPrivateNxAngularProfile(config: ProfileConfigFile): ProjectProfile {
  return createNxAngularProfile({
    name: 'nx-angular-private',
    serveProject: config.serveProject,
    port: config.port,
    baselinesDir: config.baselinesDir,
    testProjects: config.testProjects,
    buildProjects: config.buildProjects ?? [config.serveProject],
    lintProjects: config.lintProjects,
    defaultBaseBranch: config.defaultBaseBranch,
  });
}
