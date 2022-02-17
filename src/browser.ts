import puppeteer, {
  BrowserConnectOptions,
  BrowserLaunchArgumentOptions,
  LaunchOptions,
  Page,
} from "puppeteer";
import { log } from "./util";
import * as fs from "fs/promises";

const topNavSelector = "body > div.p-client_container > div.p-client > div.p-top_nav";
const statusSelector =
  "body > " +
  "div.p-client_container > " +
  "div > " +
  "div.p-top_nav > " +
  "div.p-top_nav__right > " +
  "button.p-ia__nav__user__button > " +
  "div > " +
  "i.c-icon.p-ia__nav__user__presence";

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
      "--disable-dev-shm-usage",
      "--remote-debugging-address=0.0.0.0",
      `--remote-debugging-port=${debuggingPort}`,
    ],
    ...options,
  });

  const page = await browser.newPage();
  await spoofHeadless(page);

  return { browser, page };
}

async function ensureUserDir(userDataDir: string) {
  try {
    const s = await fs.stat(userDataDir);
    log.info("Found directory", s);
    if (s.isFile()) {
      log.error(`Directory ${userDataDir} is a file. `);
      process.exit(1);
    }
  } catch (err: any) {
    log.error(`Directory ${userDataDir} is missing. Creating...`);
    if (err.code === "ENOENT") {
      await fs.mkdir(userDataDir);
    }
  }
}

export async function loadSlack(page: Page, url: string): Promise<boolean> {
  log.info("Waiting for Slack to load...");
  await page.goto(url);
  try {
    await page.waitForSelector(topNavSelector, { timeout: 10000 });
    await page.waitForSelector(statusSelector, { timeout: 10000 });
    log.info("Waiting for Active status...");
    await page.waitForFunction(getIsActiveFunc(), { polling: 100, timeout: 5000 });
    log.info("Done. Slack has been fully loaded.");
    return true;
  } catch (e) {
    log.info("Slack failed to load.");
    log.error(e);
    return false;
  }
}

function getIsActiveFunc() {
  return `
    !!document.querySelector("${statusSelector}")?.title?.toLowerCase()?.includes("active")
  `;
}

// This is where we'll put the code to get around the tests.

export async function spoofHeadless(page: Page) {
  // Pass the User-Agent Test.
  const userAgent =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36";
  await page.setUserAgent(userAgent);

  // Pass the Webdriver Test.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
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
    Object.defineProperty(navigator, "plugins", {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5],
    });
  });

  // Pass the Languages Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });
}
