import { createBrowser, getAvatarUrls, getName, loadSlack } from './browser';
import { config } from 'dotenv';
import { pushoverNotify } from './pushover';
import { takeScreenshot } from './util';

config();

(async () => {
  try {
    const { page } = await createBrowser('chrome', 9222);

    const result = await loadSlack(page, process.env.ONLY_CHROME_URL as string);
    if (!result) return;
    const screenshot = await takeScreenshot(page);
    await pushoverNotify('test-title', 'Test message', screenshot);

    // const urls = await getAvatarUrls(page);
    // const name = await getName(page);
    // console.log(urls);
    // console.log(name);
    // process.exit(0);
  } catch (e) {
    console.error(e);
  }
})();
