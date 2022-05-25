import { createBrowser } from "./src/browser";
import { delay } from "./src/util";

(async () => {
  try {
    const { page } = await createBrowser("chrome", 9222);
    await page.goto(
      "https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html",
    );
    await delay(Number.MAX_SAFE_INTEGER);
  } catch (e) {
    console.error(e);
  }
})();
