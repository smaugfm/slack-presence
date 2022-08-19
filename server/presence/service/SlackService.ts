import { PresenceService, PresenceServiceTimeouts, UserActiveData } from '../types';
import { Browser, Page } from 'puppeteer';
import { createBrowser, waitForSelector } from '../../util/browser';
import { log, takeScreenshot } from '../../util/misc';

export class SlackService implements PresenceService {
  private browser: Browser | undefined;
  private page: Page | undefined;
  private readonly userDataDir: string;
  private readonly chromeDebugPort: number;
  private readonly timeouts: PresenceServiceTimeouts;

  constructor(
    useDataDir: string,
    chromeDebugPort: number,
    defaultTimeouts: PresenceServiceTimeouts,
  ) {
    this.userDataDir = useDataDir;
    this.chromeDebugPort = chromeDebugPort;
    this.timeouts = defaultTimeouts;
  }

  get name(): string {
    return 'Slack';
  }

  async init(): Promise<void> {
    const res = await createBrowser(this.userDataDir, this.chromeDebugPort);
    this.browser = res.browser;
    this.page = res.page;
  }

  async load(url: string): Promise<boolean> {
    if (!this.browser || !this.page) this.throwNotInitialized();

    try {
      await this.page.goto(url);
      return true;
    } catch (e) {
      log.error(e);
      return false;
    }
  }

  async waitLoaded(timeout?: number): Promise<boolean> {
    if (!this.browser || !this.page) this.throwNotInitialized();

    return this.isSlackLoaded(this.page, timeout ?? this.timeouts.waitLoad);
  }

  async waitActive(timeout?: number): Promise<boolean> {
    if (!this.browser || !this.page) this.throwNotInitialized();

    return this.isSlackActive(this.page, timeout ?? this.timeouts.waitActive);
  }

  async getActiveData(): Promise<UserActiveData> {
    if (!this.browser || !this.page) this.throwNotInitialized();

    return {
      avatarUrls: await this.getAvatarUrls(this.page),
      userName: await this.getName(this.page),
    };
  }

  getScreenshot(): Promise<Buffer> {
    if (!this.browser || !this.page) this.throwNotInitialized();

    return takeScreenshot(this.page);
  }

  close() {
    this.browser?.close();
  }

  private async getName(page: Page) {
    if (await waitForSelector(page, nameSelector)) {
      return await page.$eval(nameSelector, (el: any) => el.innertHTML as string);
    } else {
      if (!(await waitForSelector(page, avatarSelector))) {
        return '';
      }
      log.info('Clicking on avatar');
      await page.$eval(avatarSelector, (el: any) => el.click());
      if (!(await waitForSelector(page, nameSelector, 'user name'))) {
        return '';
      }
      return await page.$eval(nameSelector, (el: any) => el.innerHTML as string);
    }
  }

  private async getAvatarUrls(page: Page) {
    if (!(await waitForSelector(page, avatarSelector, 'avatar URLs'))) return [];
    const results: string[] = (await page.$eval(avatarSelector, (el: any) => {
      return [el.getAttribute('src'), el.getAttribute('srcset')];
    })) as any;
    const url = results[0];
    const url2x = results[1].split(/\s/)[0];
    log.info('Got avatar URLs: ', url, url2x);
    return [url, url2x];
  }

  private async isSlackActive(page: Page, timeout: number): Promise<boolean> {
    try {
      await page.waitForFunction(this.getIsActiveFunc(), { polling: 100, timeout });
      return true;
    } catch (e) {
      return false;
    }
  }

  private async isSlackLoaded(page: Page, timeout: number): Promise<boolean> {
    try {
      await page.waitForSelector(topNavSelector, { timeout });
      await page.waitForSelector(statusSelector, { timeout });

      return true;
    } catch (e) {
      return false;
    }
  }

  private throwNotInitialized(): never {
    throw new Error('SlackService has not been initialized!');
  }

  private getIsActiveFunc() {
    return `
    !!document.querySelector("${statusSelector}")?.title?.toLowerCase()?.includes("active")
  `;
  }
}

const topNavSelector = 'body > div.p-client_container > div > div.p-top_nav';
const statusSelector =
  '#c-coachmark-anchor > button > div > ' +
  'i.c-icon.p-ia__nav__user__presence.c-presence.c-presence--active.c-icon--presence-online';
const avatarSelector = '#c-coachmark-anchor > button > div > span > span > img';
const nameSelector =
  'body > div.ReactModalPortal > div > div > div > div > div > div > ' +
  'div:nth-child(1) > div > div.p-ia__main_menu__user__details > div > span';

