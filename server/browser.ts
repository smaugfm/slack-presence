import puppeteer, {
  BrowserConnectOptions,
  BrowserLaunchArgumentOptions,
  LaunchOptions,
  Page,
} from 'puppeteer';
import { log } from './util';
import * as fs from 'fs/promises';
import * as path from 'path';

const topNavSelector = 'body > div.p-client_container > div.p-client > div.p-top_nav';
const statusSelector =
  'body > ' +
  'div.p-client_container > ' +
  'div > ' +
  'div.p-top_nav > ' +
  'div.p-top_nav__right > ' +
  'button.p-ia__nav__user__button > ' +
  'div > ' +
  'i.c-icon.p-ia__nav__user__presence';

const avatarSelector =
  'body > div.p-client_container > div > ' +
  'div.p-top_nav > div.p-top_nav__right > ' +
  'button > div > span > span > img';

const nameSelector =
  'body > div.ReactModalPortal > div > div > div > div > div > div > ' +
  'div:nth-child(1) > div > div.p-ia__main_menu__user__details > div > span';

export async function createBrowser(
  userDataDir: string,
  debuggingPort: number,
  options: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions = {},
) {
  await ensureUserDir(userDataDir);

  const browser = await puppeteer.launch({
    userDataDir,
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-setuid-sandbox',
      '--remote-debugging-address=0.0.0.0',
      `--remote-debugging-port=${debuggingPort}`,
    ],
    ...options,
  });
  const page = (await browser.pages())?.[0] ?? (await browser.newPage());
  await spoofHeadless(page);

  return { browser, page };
}

async function ensureUserDir(userDataDir: string) {
  try {
    const s = await fs.stat(userDataDir);
    log.info('Found chrome user dir: ', path.join(__dirname, userDataDir));
    if (s.isFile()) {
      log.error(`Directory ${userDataDir} is a file. `);
      process.exit(1);
    }
  } catch (err: any) {
    log.error(`Directory ${userDataDir} is missing. Creating...`);
    if (err.code === 'ENOENT') {
      await fs.mkdir(userDataDir);
    }
  }
}

export async function getAvatarUrls(page: Page) {
  if (!(await waitForSelector(page, avatarSelector, 'avatar URLs'))) return [];
  const results: string[] = (await page.$eval(avatarSelector, (el: any) => {
    return [el.getAttribute('src'), el.getAttribute('srcset')];
  })) as any;
  const url = results[0];
  const url2x = results[1].split(/\s/)[0];
  log.info('Got avatar URLs: ', url, url2x);
  return [url, url2x];
}

export async function getName(page: Page) {
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

export async function waitForSelector(page: Page, selector: string, name?: string) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch (e) {
    if (name) log.error(`Failed to get ${name}. `, e);
    return false;
  }
}

export async function isSlackLoaded(
  page: Page,
  logging: boolean,
  timeout: number,
): Promise<boolean> {
  try {
    await page.waitForSelector(topNavSelector, { timeout });
    await page.waitForSelector(statusSelector, { timeout });
    if (logging) log.info('Waiting for Active status...');
    await page.waitForFunction(getIsActiveFunc(), { polling: 100, timeout });
    if (logging) log.info('Done. Slack has been fully loaded.');
    return true;
  } catch (e) {
    if (logging) log.info('Slack failed to load. ', (e as any)?.message);
    return false;
  }
}

export enum SlackLoadingResult {
  Loaded = 'Loaded',
  NotLoaded = 'NotLoaded',
  Failed = 'Failed',
}

export async function loadSlack(page: Page, url: string): Promise<SlackLoadingResult> {
  log.info('Waiting for Slack to load...');
  try {
    await page.goto(url);
  } catch (e) {
    log.error(e);
    return SlackLoadingResult.Failed;
  }
  const result = await isSlackLoaded(page, true, 10000);
  return result ? SlackLoadingResult.Loaded : SlackLoadingResult.NotLoaded;
}

function getIsActiveFunc() {
  return `
    !!document.querySelector("${statusSelector}")?.title?.toLowerCase()?.includes("active")
  `;
}

// This is where we'll put the code to get around the tests.
async function spoofHeadless(page: Page) {
  // Pass the User-Agent Test.
  const userAgent =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36';
  await page.setUserAgent(userAgent);

  // Pass the Webdriver Test.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  // Pass the Chrome Test.
  await page.evaluateOnNewDocument(
    // We can mock this in as much depth as we need for the test.
    `window.navigator.chrome = {
      runtime: {},
      // etc.
    }`,
  );

  // Pass the Permissions Test.
  await page.evaluateOnNewDocument(`
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  `);

  // Pass the Plugins Length Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, 'plugins', {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5],
    });
  });

  // Pass the Languages Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });
}
