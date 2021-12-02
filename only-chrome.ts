import { createBrowser } from "./src/browser";
import { delay } from "./src/util";

(async () => {
  const { browser, page } = await createBrowser();
  try {
    await page.goto(
      "https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html",
    );
    await delay(Number.MAX_SAFE_INTEGER);
  } catch (e) {
    await browser.close();
  }
})();
