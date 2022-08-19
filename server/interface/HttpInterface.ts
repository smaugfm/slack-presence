import express from 'express';
import expressWs from 'express-ws';
import path from 'path';
import fs from 'fs';
import WebSocket from 'ws';
import { Options } from '../../src/common/common';
import { host, log, onWsMessage, port, route, wsSend } from '../util/misc';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import {
  LoopControlerInterfaceFactory,
  LoopControlInterface,
  PresenceLoop,
} from '../types';

const frontPathCandidates = [['..', '..', 'build'], ['build']];

export const HttpInterfaceFactory: LoopControlerInterfaceFactory = {
  create(loop: PresenceLoop): LoopControlInterface | undefined {
    const app = expressWs(express().use(bodyParser.json())).app;

    const frontPath = frontPathCandidates
      .map(x => path.join(__dirname, ...x))
      .find(fs.existsSync);

    if (!frontPath) {
      log.error('Could not find path to front');
      process.exit(1);
      return;
    }

    app.use(morgan('dev'));
    app.use(express.static(frontPath));

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
        log.info(`[ws] sending status ${JSON.stringify(loop.getStatus())}`);
        wsSend(ws, {
          type: 'status',
          status: loop.getStatus(),
        });
        log.info(`[ws] sending settings ${JSON.stringify(loop.getOptions())}`);
        wsSend(ws, {
          type: 'settings',
          settings: loop.getOptions(),
        });
      });
    });

    route(app, 'get', '/', async (req, res) => {
      const p = path.join(frontPath, 'index.html');
      res.sendFile(p);
      res.end();
    });
    route<Partial<Options>>(app, 'patch', '/api/options', async (req, res) => {
      log.info(`PATCH settings ${JSON.stringify(req.body)}`);
      await loop.saveOptionsAndChangeState(req.body);
      res.status(204);
      res.end();
    });

    loop.on('status', status => {
      if (socket) log.info(`[ws] sending status ${JSON.stringify(status)}`);
      wsSend(socket, {
        type: 'status',
        status,
      });
    });
    loop.on('options', options => {
      if (socket) log.info(`[ws] sending settings ${JSON.stringify(options)}`);
      wsSend(socket, {
        type: 'settings',
        settings: options,
      });
    });

    return {
      start() {
        return new Promise(resolve => {
          app.listen(port, host, () => {
            console.log(`Listening on http://${host}:${port}...`);
            resolve();
          });
        });
      },
    };
  },
};
