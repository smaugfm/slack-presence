import express from 'express';
import path from 'path';
import fs, { promises } from 'fs';
import WebSocket from 'ws';
import { Options } from '../../src/common/common';
import { log, onWsMessage, route, wsSend } from '../util/misc';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import {
  LoopControlInterface,
  LoopControlInterfaceFactory,
  PresenceLoop,
} from '../types';
import * as http from 'node:http';

const frontPathCandidates = [['..', '..', 'build'], ['build']];

export class WebInterfaceFactory implements LoopControlInterfaceFactory {
  private host: string;
  private port: number;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  create(loop: PresenceLoop): LoopControlInterface | undefined {
    const app = express().use(bodyParser.json());
    const httpServer = http.createServer(app);
    const webSocketServer = new WebSocket.Server({ noServer: true });

    const frontPath = frontPathCandidates
      .map(x => path.join(__dirname, ...x))
      .find(fs.existsSync);

    if (!frontPath) {
      log.error('Could not find path to front');
      process.exit(1);
      return;
    }

    app.use(morgan('dev'));

    route(app, 'get', '/', async (req, res) => {
      const p = path.join(frontPath, 'index.html');
      const indexHtml = await promises.readFile(p, 'utf-8');
      res.send(
        indexHtml.replace(
          /\bwindow\.WS_PORT\s*=\s*9333;?/,
          `window.WS_PORT = ${this.port};`,
        ),
      );
      res.end();
    });

    app.use(express.static(frontPath));

    let socket: WebSocket.WebSocket | undefined;
    const wsPath = '/api/socket';

    webSocketServer.on('connection', (server: WebSocket.WebSocket) => {
      // socket = server;
      server.on('error', err => {
        log.info('[ws] error ', err);
      });
      server.on('close', () => {
        socket = undefined;
      });
      server.on('message', msg => {
        log.info(`[ws] received '${msg}'`);
      });
      onWsMessage(server, 'initial', () => {
        log.info(`[ws] sending status ${JSON.stringify(loop.getStatus())}`);
        wsSend(server, {
          type: 'status',
          status: loop.getStatus(),
        });
        log.info(`[ws] sending settings ${JSON.stringify(loop.getOptions())}`);
        wsSend(server, {
          type: 'settings',
          settings: loop.getOptions(),
        });
      });
    });

    httpServer.on('upgrade', (req, socket, head) => {
      const { pathname } = new URL(req.url!, 'wss://base.url');
      if (pathname === wsPath) {
        webSocketServer.handleUpgrade(req, socket, head, ws => {
          webSocketServer.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    route(app, 'get', '/start', async (req, res) => {
      await loop.saveOptionsAndChangeState({
        enabled: true,
      });
      res.status(204);
      res.end();
    });
    route(app, 'get', '/stop', async (req, res) => {
      await loop.saveOptionsAndChangeState({
        enabled: false,
      });
      res.status(204);
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

    const that = this;

    return {
      start() {
        return new Promise(resolve => {
          httpServer.listen(that.port, that.host, () => {
            console.log(`Listening on http://${that.host}:${that.port}...`);
            resolve();
          });
        });
      },
    };
  }
}
