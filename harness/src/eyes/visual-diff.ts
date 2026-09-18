import fs from 'node:fs/promises';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { baselinePath } from '../profiles/nx-angular.js';
import type { HarnessConfig, VisualDiffResult } from '../types.js';
import { captureScreenshotBuffer } from './screenshot.js';

const DIFF_THRESHOLD = 0.1;

function loadPng(buffer: Buffer): PNG {
  return PNG.sync.read(buffer);
}

function toImagePayload(png: PNG): { data: string; mimeType: 'image/png' } {
  return {
    data: PNG.sync.write(png).toString('base64'),
    mimeType: 'image/png',
  };
}

function resizeToMatch(source: PNG, width: number, height: number): PNG {
  if (source.width === width && source.height === height) {
    return source;
  }

  const resized = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.min(source.width - 1, Math.round((x / width) * source.width));
      const srcY = Math.min(source.height - 1, Math.round((y / height) * source.height));
      const srcIdx = (source.width * srcY + srcX) << 2;
      const dstIdx = (width * y + x) << 2;
      resized.data[dstIdx] = source.data[srcIdx];
      resized.data[dstIdx + 1] = source.data[srcIdx + 1];
      resized.data[dstIdx + 2] = source.data[srcIdx + 2];
      resized.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }
  return resized;
}

export async function visualDiff(
  config: HarnessConfig,
  route: string,
): Promise<VisualDiffResult> {
  const baselineFile = baselinePath(config.workspaceRoot, config.profile, route);
  const baselineBuffer = await fs.readFile(baselineFile);
  const screenshotBuffer = await captureScreenshotBuffer(config, route);

  const baseline = loadPng(baselineBuffer);
  let current = loadPng(screenshotBuffer);

  if (current.width !== baseline.width || current.height !== baseline.height) {
    current = resizeToMatch(current, baseline.width, baseline.height);
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold: DIFF_THRESHOLD },
  );

  const totalPixels = baseline.width * baseline.height;
  const diffRatio = diffPixels / totalPixels;
  const passed = diffPixels === 0;

  return {
    route,
    url: new URL(route.startsWith('/') ? route : `/${route}`, config.profile.devServerUrl()).toString(),
    baselinePath: baselineFile,
    passed,
    diffPixels,
    totalPixels,
    diffRatio,
    screenshot: {
      data: screenshotBuffer.toString('base64'),
      mimeType: 'image/png',
    },
    diffImage: passed ? null : toImagePayload(diff),
  };
}
