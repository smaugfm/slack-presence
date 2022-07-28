import {
  chromeDebugPort,
  host,
  log,
  readOptions,
  takeScreenshot,
  writeOptions,
} from '../util';
import { Browser, Page } from 'puppeteer';
import {
  createBrowser,
  getAvatarUrls,
  getName,
  isSlackLoaded,
  loadSlack,
  SlackLoadingResult,
} from '../browser';
import prettyMilliseconds from 'pretty-ms';
import { Options, PresenceStatus, waitForCondition } from '../../src/common/common';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import { Schedule } from './Schedule';
import { isEqual } from 'lodash';
import axios from 'axios';
import { pushoverNotify } from '../pushover';

type PresenceLoopEvents = {
  status: (status: PresenceStatus) => void;
  options: (options: Options) => void;
};

export class PresenceLoop extends (EventEmitter as new () => TypedEmitter<PresenceLoopEvents>) {
  private browser: Browser | undefined;
  private page: Page | undefined;
  private readonly schedule: Schedule;
  private opts: Options;
  private internalStatus: PresenceStatus = { status: 'inactive' };

  constructor() {
    super();
    this.opts = readOptions('options.json');
    if (!this.opts.start || !this.opts.end) {
      throw new Error('Invalid options.json: mandatory date is missing.');
    }
    this.schedule = this.createSchedule();
    log.info('SlackLoop status: ', this.status);
  }

  public get options() {
    return this.opts;
  }

  public get status() {
    return this.internalStatus;
  }

  async start() {
    const res = await createBrowser(this.opts.userDataDir, chromeDebugPort);
    this.browser = res.browser;
    this.page = res.page;

    this.mainLoop();
  }

  close() {
    return this.browser?.close();
  }

  async saveOptionsAndChangeState(newOptions: Partial<Options>) {
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

  private createSchedule() {
    return new Schedule(
      this.opts.start,
      this.opts.end,
      async () => {
        log.info('[schedule] Presence enabled');
        await Promise.all([
          this.enableLoop(),
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
          this.disableLoop(),
          this.notify('Slack presence stopped', 'Stopping to appear online on Slack.'),
        ]);
      },
    );
  }

  private async enableLoop() {
    await this.saveOptionsAndChangeState({ enabled: true });
  }

  private async disableLoop() {
    await this.saveOptionsAndChangeState({ enabled: false });
  }

  private mainLoop() {
    setTimeout(async () => {
      try {
        while (this.opts?.enabled) {
          if (!this.browser || !this.page) {
            const res = await createBrowser(this.opts.userDataDir, chromeDebugPort);
            this.browser = res.browser;
            this.page = res.page;
          }

          this.status = { status: 'loading' };
          const loadedResult = await loadSlack(this.page, this.opts.slackUrl);
          if (loadedResult === SlackLoadingResult.Loaded) {
            await this.startLoop(this.page);
          } else if (loadedResult === SlackLoadingResult.NotLoaded) {
            await this.reactWithNeedsReLogin();
            break;
          } else if (loadedResult === SlackLoadingResult.Failed) {
            await this.reactWithFailed();
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
            this.status = { status: 'inactive' };
          }
        }

        // waiting for loop to re-enable
        await waitForCondition(() => this.opts?.enabled, undefined, 1000);

        log.info('Loop starting...');
        this.mainLoop();
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

  private async reactWithFailed() {
    await this.disableLoop();
    await this.notify(
      'Failed to load Slack',
      'Slack presence failed to load your Slack workspace.',
      true,
    );
    this.status = {
      status: 'failedToLoad',
    };
  }

  private async reactWithNeedsReLogin() {
    await this.disableLoop();
    await this.needsReLogin();

    await this.notify(
      'Slack needs re-login',
      'Slack presence failed to load your Slack workspace. ' +
        'Please open the app and re-login to Slack manually there.',
      true,
    );
    await this.waitForReLogin();
  }

  private set status(value: PresenceStatus) {
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

  private async notify(title: string, message: string, screen = false) {
    await pushoverNotify(title, message, () =>
      this.page && screen ? takeScreenshot(this.page) : undefined,
    );
  }

  private async startLoop(page: Page) {
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
          if (await isSlackLoaded(this.page, false, 2000)) {
            await this.enableLoop();
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
