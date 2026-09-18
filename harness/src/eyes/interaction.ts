import type { Page } from 'playwright';
import type { HarnessConfig, ImagePayload } from '../types.js';
import { ensureDevServer } from './dev-server.js';
import { loadInteractionTest } from './interaction-loader.js';
import type {
  ActionLogEntry,
  BrowserAction,
  InteractResult,
  InteractionAssertion,
  InteractionTestResult,
  InteractionTestSpec,
} from './interaction-types.js';
import { getBrowser } from './screenshot.js';

const DEFAULT_VIEWPORT = { width: 800, height: 600 };

function toImagePayload(buffer: Buffer): ImagePayload {
  return {
    data: buffer.toString('base64'),
    mimeType: 'image/png',
  };
}

async function executeAction(page: Page, action: BrowserAction): Promise<void> {
  switch (action.type) {
    case 'click':
      await page.click(action.selector);
      return;
    case 'fill':
      await page.fill(action.selector, action.value);
      return;
    case 'wait':
      await page.waitForTimeout(action.ms);
      return;
    case 'waitForSelector':
      await page.waitForSelector(action.selector, { timeout: 15_000 });
      return;
    case 'screenshot':
      return;
    default: {
      const unknownAction = action as BrowserAction;
      throw new Error(`Unsupported browser action: ${JSON.stringify(unknownAction)}`);
    }
  }
}

async function runActions(
  page: Page,
  actions: BrowserAction[],
): Promise<{ actionLog: ActionLogEntry[]; lastScreenshot?: ImagePayload }> {
  const actionLog: ActionLogEntry[] = [];
  let lastScreenshot: ImagePayload | undefined;

  for (const [index, action] of actions.entries()) {
    try {
      await executeAction(page, action);
      if (action.type === 'screenshot') {
        const buffer = await page.screenshot({ fullPage: true, type: 'png' });
        lastScreenshot = toImagePayload(buffer);
      }
      actionLog.push({ index, action, status: 'ok' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      actionLog.push({ index, action, status: 'error', message });
      throw new Error(message);
    }
  }

  return { actionLog, lastScreenshot };
}

async function evaluateAssertions(
  page: Page,
  assertions: InteractionAssertion[],
): Promise<string | undefined> {
  for (const assertion of assertions) {
    if (assertion.type !== 'textContent') {
      return `Unsupported assertion type: ${assertion.type}`;
    }

    const actual = await page.locator(assertion.selector).first().textContent();
    const normalizedActual = actual?.trim() ?? '';
    if (normalizedActual !== assertion.expected) {
      return `Expected "${assertion.expected}" but found "${normalizedActual}" for selector ${assertion.selector}`;
    }
  }

  return undefined;
}

async function withInteractionPage<T>(
  config: HarnessConfig,
  route: string,
  run: (page: Page, url: string, normalizedRoute: string) => Promise<T>,
): Promise<T> {
  const baseUrl = await ensureDevServer(config);
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const url = new URL(normalizedRoute, baseUrl).toString();

  const page = await (await getBrowser()).newPage({ viewport: DEFAULT_VIEWPORT });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="catalog-banner"]', { timeout: 15_000 });
    return await run(page, url, normalizedRoute);
  } finally {
    await page.close();
  }
}

export async function interact(
  config: HarnessConfig,
  route: string,
  actions: BrowserAction[],
): Promise<InteractResult> {
  return withInteractionPage(config, route, async (page, url, normalizedRoute) => {
    const { actionLog, lastScreenshot } = await runActions(page, actions);
    const buffer = await page.screenshot({ fullPage: true, type: 'png' });

    return {
      route: normalizedRoute,
      url,
      actionLog,
      screenshot: lastScreenshot ?? toImagePayload(buffer),
    };
  });
}

async function runInteractionSpec(
  config: HarnessConfig,
  name: string,
  spec: InteractionTestSpec,
): Promise<InteractionTestResult> {
  return withInteractionPage(config, spec.route, async (page, url, normalizedRoute) => {
    let actionLog: ActionLogEntry[] = [];

    try {
      ({ actionLog } = await runActions(page, spec.actions));
    } catch (error) {
      const buffer = await page.screenshot({ fullPage: true, type: 'png' });
      return {
        name,
        route: normalizedRoute,
        url,
        passed: false,
        actionLog,
        failureReason: error instanceof Error ? error.message : String(error),
        screenshot: toImagePayload(buffer),
      };
    }

    const failureReason = await evaluateAssertions(page, spec.assertions);
    if (failureReason) {
      const buffer = await page.screenshot({ fullPage: true, type: 'png' });
      return {
        name,
        route: normalizedRoute,
        url,
        passed: false,
        actionLog,
        failureReason,
        screenshot: toImagePayload(buffer),
      };
    }

    return {
      name,
      route: normalizedRoute,
      url,
      passed: true,
      actionLog,
    };
  });
}

export async function runInteractionTest(
  config: HarnessConfig,
  name: string,
): Promise<InteractionTestResult> {
  const spec = await loadInteractionTest(config.workspaceRoot, name);
  return runInteractionSpec(config, name, spec);
}
