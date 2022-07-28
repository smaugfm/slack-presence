import { PresenceLoop } from './presence/PresenceLoop';
import { gracefulShutdown } from 'node-schedule';
import { setupExpress } from './routes';
import { host, port } from './util';
import { config } from 'dotenv';

config();

const slackLoop = new PresenceLoop();

const app = setupExpress(slackLoop);

console.log(`Listening on http://${host}:${port}...`);

process.on('SIGINT', function () {
  gracefulShutdown()
    .then(() => slackLoop.close())
    .then(() => process.exit(0));
});

app?.listen(port, host, async () => {
  await slackLoop.start();
});
