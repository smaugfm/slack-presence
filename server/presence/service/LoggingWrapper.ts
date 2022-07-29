import { PresenceService } from '../types';
import { log, measure } from '../../util/misc';
import prettyMilliseconds from "pretty-ms";

export class LoggingWrapper<T> implements PresenceService<T> {
  private inner: PresenceService<T>;

  constructor(inner: PresenceService<T>) {
    this.inner = inner;
  }

  get name() {
    return this.inner.name;
  }

  private get service() {
    return `${this.name} service`;
  }

  close(): void {
    log.info(`Closing ${this.service}.`);
  }

  init(): Promise<void> {
    log.info(`Initializing ${this.service}.`);
    return this.inner.init();
  }

  async load(url: string): Promise<boolean> {
    log.info(`Loading ${this.service}: ${url}...`);
    const [result, ms] = await measure(() => this.inner.load(url));
    if (result)
      log.info(`Loaded ${this.service} ${url} in ${prettyMilliseconds(ms)}`);
    else
      log.info(`Failed to load ${this.service} ${url} in ${prettyMilliseconds(ms)}`);

    return result;
  }

  async waitLoaded(timeout?: number): Promise<boolean> {
    log.info(`Waiting for ${this.name} to fully load page...`);
    const [result, ms] = await measure(() => this.inner.waitLoaded(timeout));
    if (result)
      log.info(`${this.name} has loaded the page in ${prettyMilliseconds(ms)}`);
    else
      log.info(`${this.name} failed to load the page in ${prettyMilliseconds(ms)}`);

    return result;
  }

  async waitActive(timeout?: number): Promise<boolean> {
    log.info(`Waiting for ${this.name} to become active...`);
    const [result, ms] = await measure(() => this.inner.waitActive(timeout));
    if (result)
      log.info(`${this.name} has become active in ${prettyMilliseconds(ms)}`);
    else
      log.info(`${this.name} failed to become active in ${prettyMilliseconds(ms)}`);
    return result;
  }

  getScreenshot(): Promise<Buffer> {
    log.info(`Taking screenshot of ${this.name}`);
    return this.inner.getScreenshot();
  }

  getActiveData(): Promise<T> {
    return Promise.resolve(this.inner.getActiveData());
  }
}
