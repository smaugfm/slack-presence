import {
  chromeDebugPort,
  host,
  log,
  readOptions,
  takeScreenshot,
  writeOptions,
} from './util';
import {Browser, Page} from 'puppeteer';
import {
  createBrowser,
  getAvatarUrls,
  getName,
  isSlackLoaded,
  loadSlack,
  SlackLoadingResult,
} from './browser';
import prettyMilliseconds from 'pretty-ms';
import {Options, SlackStatus, waitForCondition} from '../src/common/common';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import {Schedule} from './Schedule';
import {isEqual} from 'lodash';
import axios from 'axios';
import {pushoverNotify} from './pushover';

type SlackLoopEvents = {
  status: (status: SlackStatus) => void;
  options: (options: Options) => void;
};

export class SlackLoop extends (EventEmitter as new () => TypedEmitter<SlackLoopEvents>) {
  private browser: Browser | undefined;
  private page: Page | undefined;
  private readonly schedule: Schedule;
  private opts: Options;
  private internalStatus: SlackStatus = {status: 'inactive'};

  constructor() {
    super();
    this.opts = readOptions('options.json');
    if (!this.opts.start) {
      log.error('No startDate in options.');
    }
    if (!this.opts.end) {
      log.error('No startDate in options.');
    }
    this.schedule = new Schedule(
        this.opts.start,
        this.opts.end,
        async () => {
          log.info('[schedule] Presence enabled');
          await Promise.all([
            this.saveOptions({
              enabled: true,
            }),
            this.notify(
                'Slack presence started',
                'Starting to appear online on Slack at ' +
                `${this.opts.slackUrl} from ${this.opts.start} to ${this.opts.end}.`,
            ),
          ]);
        },
        async () => {
          log.info('[schedule] Presence disabled');
          await Promise.all([
            this.saveOptions({
              enabled: false,
            }),
            this.notify('Slack presence stopped', 'Stopping to appear online on Slack.'),
          ]);
        },
    );
    log.info('SlackLoop status: ', this.status);
  }

  public get options() {
    return this.opts;
  }

  public get status() {
    return this.internalStatus;
  }

  private set status(value: SlackStatus) {
    if (isEqual(value, this.internalStatus)) {
      log.info('Status is equal to previous status');
    } else {
      log.info(
          'emitting SlackLoop status change: ' +
          `${this.internalStatus.status} -> ${value.status}`,
      );
      this.internalStatus = value;
      this.emit('status', value);
    }
  }

  async start() {
    const res = await createBrowser(this.opts.userDataDir, chromeDebugPort);
    this.browser = res.browser;
    this.page = res.page;

    this.presenceLoop();
  }

  private presenceLoop() {
    setTimeout(async () => {
      try {
        while (this.opts?.enabled) {
          if (!this.browser || !this.page) {
            const res = await createBrowser(this.opts.userDataDir, chromeDebugPort);
            this.browser = res.browser;
            this.page = res.page;
          }

          this.status = {status: 'activating'};
          const loaded = await loadSlack(this.page, this.opts.slackUrl);
          if (loaded === SlackLoadingResult.Loaded) {
            await this.activate(this.page);
          } else if (loaded === SlackLoadingResult.NotLoaded) {
            await this.saveOptions({enabled: false});
            await this.needsReLogin();

            await this.notify(
                'Slack needs relogin',
                'Slack presence failed to load your Slack workspace. ' +
                'Please open the app and re-login to Slack manually there.',
                true,
            );
            await this.waitForReLogin();
            break;
          } else if (loaded === SlackLoadingResult.Failed) {
            await this.saveOptions({enabled: false});
            await this.notify(
                'Failed to load Slack',
                'Slack presence failed to load your Slack workspace.',
                true,
            );
            this.status = {
              status: 'failedToLoad',
            };
            break;
          }
          const interval = this.opts.intervalMinutes * 1000 * 60;
          log.info(`Waiting for ${prettyMilliseconds(interval)}...`);
          await waitForCondition(() => !this.opts.enabled, interval);
        }
        if (this.status.status === 'inactive' || this.status.status === 'active') {
          if (this.opts.start)
            this.status = {
              status: 'outOfSchedule',
              startISOTime: this.schedule.nextStart()?.toISOString(),
            };
          else {
            this.status = {status: 'inactive'};
          }
        }

        // waiting for loop to re-enable
        await waitForCondition(() => this.opts?.enabled, undefined, 1000);

        log.info('Loop starting...');
        this.presenceLoop();
      } catch (e) {
        log.error(e);
        await this.notify(
            'Slack presence failed',
            `Unexpected error occurred: ${(e as Error)?.message}. Exiting.`,
        );
        process.exit(1);
      }
    }, 100);
  }

  private async notify(title: string, message: string, screen = false) {
    await pushoverNotify(title, message, () => this.page && screen ? takeScreenshot(this.page) : undefined);
  }

  async saveOptions(newOptions: Partial<Options>) {
    const prevOpts = this.opts;
    this.opts = {
      ...this.opts,
      ...newOptions,
    };

    if (isEqual(prevOpts, this.opts)) {
      log.info('Nothing to do, new options are equal to prev options.');
      return this.opts;
    }

    if (this.opts.start !== prevOpts.start || this.opts.end !== prevOpts.end) {
      if (this.schedule.reschedule(this.opts.start, this.opts.end)) {
        if (this.status.status === 'outOfSchedule') {
          this.status = {
            status: 'outOfSchedule',
            startISOTime: this.schedule.nextStart()?.toISOString(),
          };
        } else if (this.status.status === 'active') {
          this.status = {
            ...this.status,
            endISOTime: this.schedule.nextEnd()?.toISOString(),
          };
        }
      }
    }

    await writeOptions('options.json', this.opts);
    if (!this.opts.enabled) log.info('Loop stopped...');
    this.emit('options', this.opts);
  }

  private async activate(page: Page) {
    log.info('Loop started.');
    const urls = await getAvatarUrls(page);
    const name = await getName(page);
    this.status = {
      status: 'active',
      avatarUrl: urls[0],
      avatarUrl2x: urls[1],
      name,
      endISOTime: this.schedule.nextEnd()?.toISOString(),
    };
  }

  private async waitForReLogin() {
    log.info('Waiting for re-login or re-enable...');
    await waitForCondition(
        async () => {
          if (this.page) {
            if (await isSlackLoaded(this.page, false, 500)) {
              await this.saveOptions({enabled: true});
              return true;
            }
            return this.opts.enabled;
          } else return this.opts.enabled;
        },
        undefined,
        500,
    );
  }

  private async needsReLogin() {
    // TODO: show screenshot
    // const screenShot = await takeScreenshot(this.page);

    const chromeUrl = `http://${host}:${chromeDebugPort}`;
    const result = await axios.get(`${chromeUrl}/json`);
    let devtoolsFrontendUrl = result?.data?.[0]?.devtoolsFrontendUrl;
    log.info('DevTools URL: ' + devtoolsFrontendUrl);
    if (devtoolsFrontendUrl) devtoolsFrontendUrl = `${chromeUrl}${devtoolsFrontendUrl}`;

    this.status = {
      status: 'needsReLogin',
      devtoolsFrontendUrl,
    };
  }
}
