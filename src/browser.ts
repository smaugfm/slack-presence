import puppeteer, { Page, TimeoutError } from "puppeteer";
import { log, takeScreenshot } from "./util";

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

export async function createBrowser() {
  const browser = await puppeteer.launch({
    userDataDir: "./.chrome",
    headless: true,
  });

  const page = await browser.newPage();
  await spoofHeadless(page);

  return { browser, page };
}

export async function loadSlack(page: Page, url: string) {
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
    log.error(e);
    log.info("Slack failed to load.");
    await takeScreenshot(page);
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
