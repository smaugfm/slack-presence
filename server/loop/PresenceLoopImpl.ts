import {getRemoteUrl, log, writeOptions} from '../util/misc';
import prettyMilliseconds from 'pretty-ms';
import {Options, PresenceStatus, waitForCondition} from '../../src/common/common';
import {Schedule} from '../schedule/Schedule';
import {isEqual} from 'lodash';
import {Notifier, NotifierUrl, PresenceLoop, PresenceService} from '../types';
import {DevToolsService} from '../devtools/DevToolsService';

export class PresenceLoopImpl extends PresenceLoop {
  private readonly presenceService: PresenceService;
  private readonly schedule: Schedule;
  private options: Options;
  private notifiers: Notifier[];
  private readonly status: PresenceStatus = {status: 'inactive'};
  private devToolsService: DevToolsService;

  constructor(
      service: PresenceService,
      notifiers: Notifier[],
      devToolsService: DevToolsService,
      options: Options,
  ) {
    super();
    this.devToolsService = devToolsService;
    this.presenceService = service;
    this.notifiers = notifiers;
    this.options = options;
    this.schedule = this.createSchedule();
    log.info('PresenceLoop status: ', this.status);
  }

  public getOptions() {
    return this.options;
  }

  public getStatus() {
    return this.status;
  }

  public async start() {
    await this.presenceService.init();

    this.mainLoop();
  }

  public close() {
    return this.presenceService.close();
  }

  public async saveOptionsAndChangeState(newOptions: Partial<Options>) {
    const prevOpts = this.options;
    this.options = {
      ...this.options,
      ...newOptions,
    };

    if (isEqual(prevOpts, this.options)) {
      log.info('Nothing to do, new options are equal to prev options.');
      return;
    }

    if (this.options.start !== prevOpts.start || this.options.end !== prevOpts.end) {
      if (this.schedule.reschedule(this.options.start, this.options.end)) {
        if (this.status.status === 'outOfSchedule') {
          this.updateStatus({
            status: 'outOfSchedule',
            startISOTime: this.schedule.nextStart()?.toISOString(),
          });
        } else if (this.status.status === 'active') {
          this.updateStatus({
            ...this.status,
            endISOTime: this.schedule.nextEnd()?.toISOString(),
          });
        }
      }
    }

    await writeOptions('options.json', this.options);
    if (!this.options.enabled) {
      log.info('Loop stopped...');
      await this.notifyLoopStopped();
    }

    this.emit('options', this.options);
  }

  private createSchedule() {
    return new Schedule(
        this.options.start,
        this.options.end,
        () => {
          log.info('[schedule] Presence enabled');
          return this.enableLoop();
        },
        () => {
          log.info('[schedule] Presence disabled');
          return this.disableLoop();
        },
    );
  }

  private async enableLoop() {
    await this.saveOptionsAndChangeState({enabled: true});
    await this.notifyLoopStarted();
  }

  private async disableLoop() {
    await this.saveOptionsAndChangeState({enabled: false});
    await this.notifyLoopStopped();
  }

  private async notifyLoopStarted() {
    await this.notify(
        'Slack presence started',
        'Starting to appear online on Slack at ' +
        `${this.options.slackUrl} from ${this.options.start} to ${this.options.end}. To stop visit the link below:`,
        getRemoteUrl('/stop', 'Stop Slack presence'),
    );
  }

  private async notifyLoopStopped() {
    await this.notify(
        'Slack presence stopped',
        'Stopping to appear online on Slack. To start again visit the link below:',
        getRemoteUrl('/start', 'Start Slack presence'),
    );
  }

  private mainLoop() {
    setTimeout(async () => {
      try {
        let firstIteration = true;
        while (this.options?.enabled) {
          this.updateStatus({status: 'loading'});
          if (!(await this.presenceService.load(this.options.slackUrl))) {
            await this.reactWithFailed();
            break;
          }
          if (!(await this.presenceService.waitLoaded())) {
            await this.reactWithNeedsReLogin();
            break;
          }
          if (!(await this.presenceService.waitActive())) {
            await this.reactWithNeedsReLogin();
            break;
          }

          await this.startLoop();
          if (firstIteration) {
            firstIteration = false;
            await this.notifyLoopStarted();
          }

          const interval = this.options.intervalMinutes * 1000 * 60;
          log.info(`Waiting for ${prettyMilliseconds(interval)}...`);
          await waitForCondition(() => !this.options.enabled, interval);
        }
        if (this.status.status === 'inactive' || this.status.status === 'active') {
          if (this.options.start)
            this.updateStatus({
              status: 'outOfSchedule',
              startISOTime: this.schedule.nextStart()?.toISOString(),
            });
          else {
            this.updateStatus({status: 'inactive'});
          }
        }

        // waiting for loop to re-enable
        await waitForCondition(() => this.options?.enabled, undefined, 1000);

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
        undefined,
        true,
    );
    this.updateStatus({
      status: 'failedToLoad',
    });
  }

  private async reactWithNeedsReLogin() {
    await this.disableLoop();
    await this.statusNeedsReLogin();

    await this.notify(
        'Re-login to Slack',
        'Slack presence failed to load your Slack workspace. ' +
        'Please open the app and re-login to Slack manually there.',
        undefined,
        true,
    );
    await this.waitForReLogin();
  }

  private updateStatus(value: PresenceStatus) {
    if (isEqual(value, this.status)) {
      log.info('Status is equal to previous status');
    } else {
      log.info(
          `Emitting PresenceLoop status change: ${this.status.status} -> ${value.status}`,
      );
      (this as any).status = value;
      this.emit('status', value);
    }
  }

  private async notify(
      title: string,
      message: string,
      url?: NotifierUrl,
      screen = false,
  ) {
    // noinspection ES6MissingAwait
    const imagePromise = screen ? this.presenceService.getScreenshot() : undefined;
    await Promise.all(
        this.notifiers.map(notifier => notifier.notify(title, message, imagePromise, url)),
    );
  }

  private async startLoop() {
    log.info('Loop started.');
    const {avatarUrls, userName} = await this.presenceService.getActiveData();
    this.updateStatus({
      status: 'active',
      avatarUrl: avatarUrls[0],
      avatarUrl2x: avatarUrls[1],
      name: userName,
      endISOTime: this.schedule.nextEnd()?.toISOString(),
    });
  }

  private async waitForReLogin() {
    log.info('Waiting for re-login or re-enable...');
    await waitForCondition(
        async () => {
          const loaded = await this.presenceService.waitLoaded(1000);
          const active = loaded && (await this.presenceService.waitActive(1000));
          if (loaded && active) {
            await this.enableLoop();
            return true;
          }
          return this.options.enabled;
        },
        undefined,
        500,
    );
    await this.notifyLoopStarted();
  }

  private async statusNeedsReLogin() {
    const devtoolsFrontendUrl = await this.devToolsService.getDevtoolsFrontendUrl();

    this.updateStatus({
      status: 'needsReLogin',
      devtoolsFrontendUrl,
    });
  }
}
