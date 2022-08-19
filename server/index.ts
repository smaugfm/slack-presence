import { PresenceLoopImpl } from './loop/PresenceLoopImpl';
import { gracefulShutdown } from 'node-schedule';
import { HttpInterfaceFactory } from './interface/HttpInterface';
import { chromeDebugPort, readOptions } from './util/misc';
import { config as dotEnvConfig } from 'dotenv';
import { SlackService } from './service/SlackService';
import { ServiceLogWrapper } from './service/ServiceLogWrapper';
import { PushoverNotifierFactory } from './notifier/PushoverNotifier';
import { Notifier } from './types';

dotEnvConfig();

const options = readOptions('options.json');

const slackService = new ServiceLogWrapper(
  new SlackService(options.userDataDir, chromeDebugPort, {
    waitLoad: 10_000,
    waitActive: 10_000,
  }),
);

const notifiers: Notifier[] = [PushoverNotifierFactory.createNotifier()].filter(
  x => !!x,
) as Notifier[];

const presenceLoop = new PresenceLoopImpl(slackService, notifiers, options);

const httpInterface = HttpInterfaceFactory.create(presenceLoop);

process.on('SIGINT', function () {
  gracefulShutdown()
    .then(() => presenceLoop.close())
    .then(() => process.exit(0));
});

httpInterface?.start().then(() => presenceLoop.start());
