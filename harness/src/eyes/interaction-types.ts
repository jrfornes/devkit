import type { ImagePayload } from '../types.js';

export type BrowserAction =
  | { type: 'click'; selector: string }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'wait'; ms: number }
  | { type: 'waitForSelector'; selector: string }
  | { type: 'screenshot' };

export type InteractionAssertion = {
  type: 'textContent';
  selector: string;
  expected: string;
};

export interface InteractionTestSpec {
  route: string;
  actions: BrowserAction[];
  assertions: InteractionAssertion[];
}

export interface ActionLogEntry {
  index: number;
  action: BrowserAction;
  status: 'ok' | 'error';
  message?: string;
}

export interface InteractResult {
  route: string;
  url: string;
  actionLog: ActionLogEntry[];
  screenshot: ImagePayload;
}

export interface InteractionTestResult {
  name: string;
  route: string;
  url: string;
  passed: boolean;
  actionLog: ActionLogEntry[];
  failureReason?: string;
  screenshot?: ImagePayload;
}
