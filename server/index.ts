import { PresenceLoop } from './presence/PresenceLoop';
import { gracefulShutdown } from 'node-schedule';
import { setupExpress } from './util/express';
import { chromeDebugPort, host, port, readOptions } from './util/misc';
import { config } from 'dotenv';
import { SlackService } from './presence/service/SlackService';
import { ServiceLogWrapper } from './presence/service/ServiceLogWrapper';

config();

const options = readOptions('options.json');

const slackService = new ServiceLogWrapper(
  new SlackService(options.userDataDir, chromeDebugPort, {
    waitLoad: 10_000,
    waitActive: 10_000,
  }),
);
const presenceLoop = new PresenceLoop(slackService, options);

const app = setupExpress(presenceLoop);

console.log(`Listening on http://${host}:${port}...`);

process.on('SIGINT', function () {
  gracefulShutdown()
    .then(() => presenceLoop.close())
    .then(() => process.exit(0));
});

app?.listen(port, host, async () => {
  await presenceLoop.start();
});
