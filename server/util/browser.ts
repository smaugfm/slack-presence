import puppeteer, {
  LaunchOptions,
  Page,
} from 'puppeteer';
import { log } from './misc';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function createBrowser(
  userDataDir: string,
  debuggingPort: number,
  options: LaunchOptions = {},
) {
  await ensureUserDir(userDataDir);

  const browser = await puppeteer.launch({
    userDataDir,
    headless: true,
    browser: "chrome",
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

export async function waitForSelector(page: Page, selector: string, name?: string) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch (e) {
    if (name) log.error(`Failed to get ${name}. `, e);
    return false;
  }
}

async function getLatestChromeVersion(): Promise<String | undefined> {
  try {
    const resp = await fetch(
      'https://versionhistory.googleapis.com/v1/chrome/platforms/linux/channels/stable/versions',
    );
    const json = await resp.json();
    return json.versions[0].version;
  } catch (e) {
    log.error('Failed to get latest chrome version: ', e);
    return undefined;
  }
}

// This is where we'll put the code to get around the tests.
async function spoofHeadless(page: Page) {
  const latestChromeVersion = await getLatestChromeVersion() || '136.0.0.0';
  log.info('Chrome version for User-Agent test: ', latestChromeVersion);

  // Pass the User-Agent Test.
  const userAgent =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
    `(KHTML, like Gecko) Chrome/${latestChromeVersion} Safari/537.36`;
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
