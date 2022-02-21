import { createBrowser, loadSlack } from "./browser";
import { Job } from "node-schedule";
import en from "./en";
import {
  chromeDebugPort,
  createSchedule,
  delay,
  log,
  masterChatId,
  readOptions,
  takeScreenshot,
  writeOptions,
} from "./util";
import prettyMilliseconds from "pretty-ms";
import { Browser, Page } from "puppeteer";
import { session, Stage, Telegraf } from "telegraf";
import { SceneContextMessageUpdate } from "telegraf/typings/stage";
import { setupSetScheduleScene } from "./commands/setScheduleScene";
import { setupOtherCommands } from "./commands/other";
import i18next, { t } from "i18next";

export type Context = SceneContextMessageUpdate;

export type Options = {
  stop: boolean;
  intervalMinutes: number;
  slackUrl: string;
  userDataDir: string;

  startHour?: number;
  startMinute?: number;
  stopHour?: number;
  stopMinute?: number;
};

export async function main() {
  await i18next.init({
    lng: "en",
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en,
    },
  });
  const bot = new Telegraf<Context>(process.env.BOT_TOKEN as string);
  const optionsPath = (process.env.OPTIONS_PATH as string) ?? "options.json";

  let options = await readOptions(optionsPath);
  log.info("Options read: ", options);

  let browser: Browser | undefined;
  let page: Page | undefined;
  const res = await createBrowser(options.userDataDir, chromeDebugPort);
  browser = res.browser;
  page = res.page;

  const stage = new Stage<Context>([]);

  async function saveOptions(newOptions: Partial<Options>) {
    options = {
      ...options,
      ...newOptions,
    };
    log.info("Options saved: ", options);

    schedule.forEach(x => x.cancel());
    schedule = createSchedule(options, msg =>
      bot.telegram.sendMessage(masterChatId, msg, { disable_notification: true }),
    );
    await writeOptions(optionsPath, options);
  }

  let schedule: Job[] = createSchedule(options, msg =>
    bot.telegram.sendMessage(masterChatId, msg, { disable_notification: true }),
  );

  bot.use(session());
  bot.use(stage.middleware());
  bot.use((ctx, next) => {
    if (ctx.from?.id !== masterChatId)
      log.error(`Message from wrong user. Chat id: ${ctx.chat?.id}, From id: ${ctx.from?.id}`);
    else return next();
  });

  setupOtherCommands(
    bot,
    () => page,
    () => options,
    saveOptions,
  );
  setupSetScheduleScene(bot, stage, saveOptions);
  bot.catch((err: Error) => {
    log.error(err);
  });

  function slackLoop() {
    setTimeout(async () => {
      try {
        while (!options?.stop) {
          if (!browser || !page) {
            const res = await createBrowser(options.userDataDir, chromeDebugPort);
            browser = res.browser;
            page = res.page;
          }

          const loaded = await loadSlack(page, options.slackUrl);
          if (!loaded) {
            await saveOptions({ stop: true });
            const screenShot = await takeScreenshot(page);

            await bot.telegram.sendPhoto(
              masterChatId,
              { source: screenShot },
              {
                caption:
                  "Failed to load Slack. Stopping automatic reloading. Here is a screenshot of current headless Chrome screen.",
              },
            );
            await bot.telegram.sendMessage(masterChatId, t("loginFailed"), {
              parse_mode: "MarkdownV2",
            });
            break;
          }
          const interval = options.intervalMinutes * 1000 * 60;
          log.info(`Waiting for ${prettyMilliseconds(interval)}...`);
          await delay(interval);
        }
        log.info("Loop stopped.");

        while (options?.stop) {
          await delay(1000);
        }
        log.info("Loop started.");
        slackLoop();
      } catch (e) {
        log.error(e);
        await bot.telegram.sendMessage(masterChatId, t("fatal"));
        process.exit(1);
      }
    }, 100);
  }

  slackLoop();

  log.info("Polling telegram updates...");
  bot.startPolling();
}
