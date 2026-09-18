import { chromium, type Browser } from 'playwright';
import type { HarnessConfig, ImagePayload, ScreenshotResult } from '../types.js';
import { ensureDevServer } from './dev-server.js';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function toImagePayload(buffer: Buffer): ImagePayload {
  return {
    data: buffer.toString('base64'),
    mimeType: 'image/png',
  };
}

export async function screenshotRoute(
  config: HarnessConfig,
  route: string,
  viewport = { width: 800, height: 600 },
): Promise<ScreenshotResult> {
  const baseUrl = await ensureDevServer(config);
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const url = new URL(normalizedRoute, baseUrl).toString();

  const page = await (await getBrowser()).newPage({ viewport });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="catalog-banner"]', { timeout: 15_000 });
    const buffer = await page.screenshot({ fullPage: true, type: 'png' });

    return {
      route: normalizedRoute,
      url,
      image: toImagePayload(buffer),
    };
  } finally {
    await page.close();
  }
}

export async function captureScreenshotBuffer(
  config: HarnessConfig,
  route: string,
): Promise<Buffer> {
  const result = await screenshotRoute(config, route);
  return Buffer.from(result.image.data, 'base64');
}
