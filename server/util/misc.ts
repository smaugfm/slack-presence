import { createSimpleLogger } from 'simple-node-logger';
import { Application, IRouter, Request, Response } from 'express';
import WebSocket from 'ws';
import { Page } from 'puppeteer-core';
import fs from 'fs';
import { Options, WsClientMessage, WsServerMessage } from '../../src/common/common';
import { NotifierUrl } from '../types';

export const log = createSimpleLogger();

export function takeScreenshot(page: Page): Promise<Buffer> {
  return page.screenshot({ type: 'png', encoding: 'binary' }) as Promise<Buffer>;
}

export function wsSend(socket: WebSocket | undefined, data: WsServerMessage) {
  socket?.send(JSON.stringify(data));
}

export function onWsMessage<T extends WsClientMessage['type']>(
  socket: WebSocket | undefined,
  type: T,
  handler: (msg: Extract<WsClientMessage, { type: T }>) => void,
) {
  socket?.on('message', (msg: string) => {
    let message: WsClientMessage;
    try {
      message = JSON.parse(msg);
    } catch (e) {
      log.error('[ws] Failed to parse incoming message.\n', msg);
      return;
    }
    if (message.type === type) handler(message as any);
  });
}

export function route<Body>(
  app: Application,
  method: keyof Pick<IRouter, 'get' | 'post' | 'put' | 'delete' | 'patch'>,
  route: string,
  handler: (req: Request<{}, {}, Body>, res: Response) => Promise<void>,
) {
  const h = async (req: Request<{}, {}, Body>, res: Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      log.error(e);
      res.status(500);
    }
  };
  switch (method) {
    case 'get':
      app.get(route, h);
      break;
    case 'post':
      app.post(route, h);
      break;
    case 'put':
      app.put(route, h);
      break;
    case 'delete':
      app.delete(route, h);
      break;
    case 'patch':
      app.patch(route, h);
      break;
  }
}

export async function writeOptions(path: string, options: Partial<Options>) {
  const res = JSON.stringify(options, null, 2);
  await fs.promises.writeFile(path, res, 'utf-8');
  log.info('Options saved: ', options);
}

const defaultOptions: Options = {
  enabled: false,
  intervalMinutes: 2,
  slackUrl: 'https://app.slack.com',
  userDataDir: 'chrome',
  start: '09:00',
  end: '18:00',
};

export function getRemoteUrl(path: string, title: string): NotifierUrl | undefined {
  if (!process.env.REMOTE_URL_BASE) return;
  return { url: `${process.env.REMOTE_URL_BASE}${path}`, urlTitle: title };
}

export async function measure<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();

  return [result, performance.now() - start];
}

export function readOptions(path: string): Options {
  try {
    const options = JSON.parse(fs.readFileSync(path, 'utf-8')) as Partial<Options>;

    log.info('Options read: ', options);
    const result = {
      ...defaultOptions,
      ...options,
    };
    log.info('Returning read: ', result);
    return result;
  } catch {
    return defaultOptions;
  }
}
