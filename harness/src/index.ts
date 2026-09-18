#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { shutdownHarness } from './tools.js';
import { createToolHandlers } from './tools.js';

const config = loadConfig();
const tools = createToolHandlers(config);

const server = new McpServer({
  name: 'agentic-ui-dev-harness',
  version: '0.4.0',
});

server.tool(
  'status',
  'Report branch, workspace path, dirty files, and dev server state.',
  {},
  async () => ({
    content: [{ type: 'text', text: await tools.status() }],
  }),
);

server.tool(
  'get_diff',
  'Return the git diff for the configured workspace.',
  {},
  async () => ({
    content: [{ type: 'text', text: await tools.get_diff() }],
  }),
);

server.tool(
  'run_tests',
  'Run the workspace test suite (or a single nx project when project is provided).',
  {
    project: z
      .string()
      .optional()
      .describe('Optional nx project name, e.g. shared-data or demo'),
  },
  async ({ project }) => ({
    content: [{ type: 'text', text: await tools.run_tests(project) }],
  }),
);

server.tool(
  'lint',
  'Run lint/type-check for the configured workspace profile.',
  {},
  async () => ({
    content: [{ type: 'text', text: await tools.lint() }],
  }),
);

server.tool(
  'run_build',
  'Run the workspace build (or a single nx project when project is provided).',
  {
    project: z
      .string()
      .optional()
      .describe('Optional nx project name, e.g. demo'),
  },
  async ({ project }) => ({
    content: [{ type: 'text', text: await tools.run_build(project) }],
  }),
);

server.tool(
  'list_skills',
  'List discoverable skills with name, description, triggers, and oracle from SKILL.md frontmatter.',
  {},
  async () => ({
    content: [{ type: 'text', text: await tools.list_skills() }],
  }),
);

server.tool(
  'run_skill',
  'Invoke a named skill from the skills library.',
  {
    name: z.string().describe('Skill name, e.g. heal-failing-test'),
  },
  async ({ name }) => ({
    content: [{ type: 'text', text: await tools.run_skill(name) }],
  }),
);

server.tool(
  'start_dev_server',
  'Start the workspace dev server for visual inspection.',
  {},
  async () => ({
    content: [{ type: 'text', text: await tools.start_dev_server() }],
  }),
);

server.tool(
  'stop_dev_server',
  'Stop the workspace dev server and close the headless browser.',
  {},
  async () => ({
    content: [{ type: 'text', text: await tools.stop_dev_server() }],
  }),
);

server.tool(
  'screenshot_route',
  'Render a route in the headless browser and return a screenshot image.',
  {
    route: z
      .string()
      .optional()
      .describe('Route path to capture, e.g. / (default)'),
  },
  async ({ route }) => {
    const result = await tools.screenshot_route(route ?? '/');
    return {
      content: [
        { type: 'text', text: result.text },
        ...result.images.map((image) => ({
          type: 'image' as const,
          data: image.data,
          mimeType: image.mimeType,
        })),
      ],
    };
  },
);

server.tool(
  'visual_diff',
  'Compare a route screenshot against a stored baseline and return diff images.',
  {
    route: z
      .string()
      .optional()
      .describe('Route path to compare, e.g. / (default)'),
  },
  async ({ route }) => {
    const result = await tools.visual_diff(route ?? '/');
    return {
      content: [
        { type: 'text', text: result.text },
        ...result.images.map((image) => ({
          type: 'image' as const,
          data: image.data,
          mimeType: image.mimeType,
        })),
      ],
    };
  },
);

const browserActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('click'),
    selector: z.string(),
  }),
  z.object({
    type: z.literal('fill'),
    selector: z.string(),
    value: z.string(),
  }),
  z.object({
    type: z.literal('wait'),
    ms: z.number(),
  }),
  z.object({
    type: z.literal('waitForSelector'),
    selector: z.string(),
  }),
  z.object({
    type: z.literal('screenshot'),
  }),
]);

server.tool(
  'interact',
  'Drive Playwright browser actions on a route and return the final screenshot.',
  {
    route: z.string().describe('Route path to open, e.g. /'),
    actions: z
      .array(browserActionSchema)
      .describe('Ordered list of browser actions to execute'),
  },
  async ({ route, actions }) => {
    const result = await tools.interact(route, actions);
    return {
      content: [
        { type: 'text', text: result.text },
        ...result.images.map((image) => ({
          type: 'image' as const,
          data: image.data,
          mimeType: image.mimeType,
        })),
      ],
    };
  },
);

server.tool(
  'run_interaction_test',
  'Run a predefined interaction test script from the workspace interaction-tests directory.',
  {
    name: z.string().describe('Interaction test name, e.g. catalog-banner'),
  },
  async ({ name }) => {
    const result = await tools.run_interaction_test(name);
    return {
      content: [
        { type: 'text', text: result.text },
        ...result.images.map((image) => ({
          type: 'image' as const,
          data: image.data,
          mimeType: image.mimeType,
        })),
      ],
    };
  },
);

server.tool(
  'open_pr',
  'Create a branch, commit workspace changes, push, and open a pull request.',
  {
    title: z.string().describe('Pull request title'),
    body: z.string().optional().describe('Pull request body'),
    draft: z.boolean().optional().describe('Open as draft (default true)'),
    base_branch: z
      .string()
      .optional()
      .describe('Base branch (default from profile or main)'),
    branch: z
      .string()
      .optional()
      .describe('Head branch name (default: generated harness/ship-* name)'),
  },
  async ({ title, body, draft, base_branch, branch }) => ({
    content: [
      {
        type: 'text',
        text: await tools.open_pr({
          title,
          body,
          draft,
          baseBranch: base_branch,
          branchName: branch,
        }),
      },
    ],
  }),
);

server.tool(
  'ci_status',
  'Report CI check status for a branch or pull request URL.',
  {
    branch: z.string().optional().describe('Branch name to inspect'),
    pr_url: z.string().optional().describe('Pull request URL to inspect'),
  },
  async ({ branch, pr_url }) => ({
    content: [
      {
        type: 'text',
        text: await tools.ci_status({ branch, prUrl: pr_url }),
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on('SIGINT', async () => {
  await shutdownHarness();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownHarness();
  process.exit(0);
});

main().catch(async (error) => {
  await shutdownHarness();
  console.error(error);
  process.exit(1);
});
