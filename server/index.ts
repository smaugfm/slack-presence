import { PresenceLoopImpl } from './loop/PresenceLoopImpl';
import { gracefulShutdown } from 'node-schedule';
import { WebInterfaceFactory } from './interface/WebInterface';
import { readOptions } from './util/misc';
import { config as dotEnvConfig } from 'dotenv';
import { SlackService } from './service/SlackService';
import { ServiceLogWrapper } from './service/ServiceLogWrapper';
import { PushoverNotifierFactory } from './notifier/PushoverNotifier';
import { Notifier } from './types';
import { DevToolsService } from './devtools/DevToolsService';

dotEnvConfig();

const chromeDebugPort = parseInt(process.env.CHROME_DEBUG_PORT || '9222');
const httpServerHost = process.env.HTTP_SERVER_HOST || 'localhost';
const httpServerPort = parseInt(process.env.HTTP_SERVER_PORT || '9333');
const waitLoadTimeoutMs = parseInt(process.env.WAIT_LOAD_TIMEOUT_MS || '20000');
const waitActiveTimeoutMs = parseInt(process.env.WAIT_ACTIVE_TIMEOUT_MS || '20000');

const options = readOptions('options.json');

const slackService = new ServiceLogWrapper(
  new SlackService(options.userDataDir, chromeDebugPort, {
    waitLoad: waitLoadTimeoutMs,
    waitActive: waitActiveTimeoutMs,
  }),
);

const notifiers: Notifier[] = [PushoverNotifierFactory.createNotifier()].filter(
  x => !!x,
) as Notifier[];

const devToolsService = new DevToolsService(httpServerHost, chromeDebugPort);

const presenceLoop = new PresenceLoopImpl(
  slackService,
  notifiers,
  devToolsService,
  options,
);

const webInterface = new WebInterfaceFactory(httpServerHost, httpServerPort).create(
  presenceLoop,
);

process.on('SIGINT', function () {
  gracefulShutdown()
    .then(() => presenceLoop.close())
    .then(() => process.exit(0));
});

webInterface?.start().then(() => presenceLoop.start());
