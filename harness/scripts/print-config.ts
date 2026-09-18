#!/usr/bin/env node
import { loadConfig } from '../src/config.js';

const config = loadConfig();

console.log(
  JSON.stringify(
    {
      profile: config.profile.name,
      repoRoot: config.repoRoot,
      workspaceRoot: config.workspaceRoot,
      gitRoot: config.gitRoot,
      skillsDir: config.skillsDir,
      serveProject: config.profile.devServer.serveProject,
      port: config.profile.devServer.port,
      baselinesDir: config.profile.devServer.baselinesDir,
      testProjects: config.profile.testProjects ?? '(all)',
      buildProjects: config.profile.buildProjects,
      lintProjects: config.profile.lintProjects ?? config.profile.testProjects ?? '(all)',
      defaultBaseBranch: config.profile.defaultBaseBranch,
    },
    null,
    2,
  ),
);
