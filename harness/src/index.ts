#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { createToolHandlers } from './tools.js';

const config = loadConfig();
const tools = createToolHandlers(config);

const server = new McpServer({
  name: 'agentic-ui-dev-harness',
  version: '0.1.0',
});

server.tool(
  'status',
  'Report branch, workspace path, and dirty files for the configured target.',
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
  'run_skill',
  'Invoke a named skill from the skills library.',
  {
    name: z.string().describe('Skill name, e.g. heal-failing-test'),
  },
  async ({ name }) => ({
    content: [{ type: 'text', text: await tools.run_skill(name) }],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
