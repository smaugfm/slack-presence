import { PresenceLoopImpl } from './presence/loop/PresenceLoopImpl';
import { gracefulShutdown } from 'node-schedule';
import { HttpInterfaceFactory } from './presence/interface/HttpInterface';
import { chromeDebugPort, readOptions } from './util/misc';
import { config } from 'dotenv';
import { SlackService } from './presence/service/SlackService';
import { ServiceLogWrapper } from './presence/service/ServiceLogWrapper';
import { PushoverNotifierFactory } from './presence/notifier/PushoverNotifier';
import { Notifier } from './presence/types';

config();

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

httpInterface?.start().then(presenceLoop.start);
