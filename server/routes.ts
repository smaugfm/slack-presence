import express from 'express';
import expressWs from 'express-ws';
import path from 'path';
import WebSocket from 'ws';
import { SlackLoop } from './SlackLoop';
import { Options } from '../src/common/common';
import { log, route, onWsMessage, wsSend } from './util';
import bodyParser from 'body-parser';
import morgan from 'morgan';

export function setupExpress(slackLoop: SlackLoop) {
  const app = expressWs(express().use(bodyParser.json())).app;
  app.use(morgan('dev'));
  app.use(express.static(path.join(__dirname, '..', 'build')));

  let socket: WebSocket | undefined;
  app.ws('/api/socket', ws => {
    socket = ws;
    ws.on('error', err => {
      log.info('[ws] error ', err);
    });
    ws.on('close', () => {
      socket = undefined;
    });
    ws.on('message', msg => {
      log.info(`[ws] received '${msg}'`);
    });
    onWsMessage(ws, 'initial', () => {
      log.info(`[ws] sending status ${JSON.stringify(slackLoop.status)}`);
      wsSend(ws, {
        type: 'status',
        status: slackLoop.status,
      });
      log.info(`[ws] sending settings ${JSON.stringify(slackLoop.options)}`);
      wsSend(ws, {
        type: 'settings',
        settings: slackLoop.options,
      });
    });

    route(app, 'get', '/', async (req, res) => {
      const p = path.join(__dirname, '..', 'build', 'index.html');
      console.log('Serving /', p);
      res.sendFile(p);
      res.end();
    });
    route<Partial<Options>>(app, 'patch', '/api/options', async (req, res) => {
      log.info(`PATCH settings ${JSON.stringify(req.body)}`);
      await slackLoop.saveOptions(req.body);
      res.status(204);
      res.end();
    });
  });

  slackLoop.on('status', status => {
    if (socket) log.info(`[ws] sending status ${JSON.stringify(status)}`);
    wsSend(socket, {
      type: 'status',
      status,
    });
  });
  slackLoop.on('options', options => {
    if (socket) log.info(`[ws] sending settings ${JSON.stringify(options)}`);
    wsSend(socket, {
      type: 'settings',
      settings: options,
    });
  });
  return app;
}
