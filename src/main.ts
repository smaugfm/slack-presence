import { createBrowser, loadSlack } from "./browser";
import TelegramBot from "node-telegram-bot-api";
import { Job } from "node-schedule";
import {
  checkUser,
  createSchedule,
  delay,
  formatTime,
  log,
  masterChatId,
  readOptions,
  writeOptions,
} from "./util";
import prettyMilliseconds from "pretty-ms";

export type Options = {
  stop: boolean;
  interval: number;

  startHour?: number;
  startMinute?: number;
  stopHour?: number;
  stopMinute?: number;
};

export async function main() {
  const bot = new TelegramBot(process.env.BOT_TOKEN as string, { polling: true });
  const optionsPath = (process.env.OPTIONS_PATH as string) ?? "options.json";

  let options = await readOptions(optionsPath);
  log.info("Options read: ", options);

  async function saveOptions(newOptions: Partial<Options>) {
    options = {
      ...options,
      ...newOptions,
    };
    log.info("Options saved: ", options);
    await writeOptions(optionsPath, options);
  }

  let schedule: Job[] = createSchedule(options);

  bot.onText(/^\/start.*$/, async msg => {
    if (checkUser(msg)) return;

    await saveOptions({ stop: false });
    await bot.sendMessage(msg.chat.id, "Started slack Active presence");
  });

  bot.onText(/^\/stop.*$/, async msg => {
    if (checkUser(msg)) return;

    await saveOptions({ stop: true });
    await bot.sendMessage(msg.chat.id, "Stopped slack Active presence");
  });

  bot.onText(/^\/schedule(\s+(\d+:\d+)\s+(\d+:\d+))?.*$/, async (msg, groups) => {
    if (checkUser(msg)) return;

    if (!groups?.[1]) {
      await bot.sendMessage(
        msg.chat.id,
        `Current schedule: starts at ${formatTime(
          options.startHour,
          options.startMinute,
        )}, finishes at ${formatTime(options.stopHour, options.stopMinute)}`,
      );
      return;
    }

    try {
      const start = groups?.[2]?.split(":")!!;
      const stop = groups?.[3]?.split(":")!!;

      await saveOptions({
        startHour: parseInt(start[0], 10),
        startMinute: parseInt(start[1], 10),
        stopHour: parseInt(stop[0], 10),
        stopMinute: parseInt(stop[1], 10),
      });
    } catch (e) {
      log.error(e);
      await bot.sendMessage(
        msg.chat.id,
        "Wrong date format. Date should be like this: 08:00 16:00",
      );
      return;
    }

    schedule = createSchedule(options);

    await bot.sendMessage(
      msg.chat.id,
      `Schedule has been set up. Weekdays, starting at ${formatTime(
        options?.startHour,
        options?.startMinute,
      )}. ` + `and finishing at ${formatTime(options?.stopMinute, options?.stopMinute)}`,
    );
  });
  bot.onText(/^\/remove.*$/, async msg => {
    if (checkUser(msg)) return;

    await saveOptions({
      startHour: undefined,
      startMinute: undefined,
      stopHour: undefined,
      stopMinute: undefined,
    });

    schedule.forEach(x => x.cancel());
    await bot.sendMessage(msg.chat.id, "Schedule has been cleared");
  });

  const { browser, page } = await createBrowser();

  try {
    while (true) {
      while (!options?.stop) {
        const loaded = await loadSlack(page, "https://app.slack.com/client/T04BNC2CD/C04BNC2FH");
        if (!loaded) {
          log.info("Failed to load slack.");
          await bot.sendMessage(masterChatId, "Failed to load Slack. Stopping automatic reload.");
          await saveOptions({ stop: true });
          break;
        }
        const interval = options.interval * 1000 * 60;
        log.info(`Waiting for ${prettyMilliseconds(interval)}...`);
        await delay(interval);
      }
      log.info("Loop stopped.");

      while (options?.stop) {
        await delay(1000);
      }
      log.info("Loop started.");
    }
  } catch (e) {
    log.error(e);
    await bot.sendMessage(masterChatId, "Unexpected error occurred. Exiting bot");
  } finally {
    await browser.close();
  }
}
