import { createSimpleLogger } from "simple-node-logger";
import { Page } from "puppeteer";
import { RecurrenceRule, scheduleJob } from "node-schedule";
import { Options } from "./main";
import { promises as fs } from "fs";
import TelegramBot from "node-telegram-bot-api";

export const log = createSimpleLogger();

export async function takeScreenshot(page: Page) {
  log.info("Saving screenshot...");
  return page.screenshot({ path: "screenshot.png" });
}

export function formatTime(hour?: number, minute?: number) {
  let hourStr = `${hour}`;
  let minuteStr = `${minute}`;

  if (hourStr.length === 1) hourStr = `0${hourStr}`;
  if (minuteStr.length === 1) minuteStr = `0${minuteStr}`;

  return `${hourStr}:${minuteStr}`;
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createSchedule(options: Options) {
  if (
    !(
      "startHour" in options &&
      "startMinute" in options &&
      "stopHour" in options &&
      "stopMinute" in options
    )
  ) {
    return [];
  }

  function createRule() {
    const rule = new RecurrenceRule();
    rule.second = 0;
    rule.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    rule.dayOfWeek = [1, 2, 3, 4, 5];
    return rule;
  }

  const startRule: RecurrenceRule = createRule();
  const stopRule: RecurrenceRule = createRule();

  startRule.hour = options.startHour!!;
  startRule.minute = options.startMinute!!;
  stopRule.hour = options.stopHour!!;
  stopRule.minute = options.stopMinute!!;

  return [
    scheduleJob(startRule, () => {
      options.stop = false;
    }),
    scheduleJob(stopRule, () => {
      options.stop = true;
    }),
  ];
}

export function writeOptions(path: string, options: Partial<Options>) {
  return fs.writeFile(path, JSON.stringify(options, null, 2));
}

export const masterChatId = parseInt(process.env.MASTER_CHAT_ID as string, 10);

export function checkUser(msg: TelegramBot.Message) {
  if (msg?.from?.id !== masterChatId) {
    log.error(`Message from wrong user. Chat_id: ${msg.chat.id}, From_id: ${msg?.from?.id}`);
    return true;
  }
  return false;
}

export const slackUrl = "https://app.slack.com/client/T04BNC2CD/C04BNC2FH";

export async function readOptions(path: string): Promise<Options> {
  try {
    return JSON.parse((await fs.readFile(path)).toString("utf-8"));
  } catch {
    return {
      stop: false,
      interval: 2 * 60 * 1000,
      startHour: 8,
      startMinute: 0,
      stopHour: 16,
      stopMinute: 0,
    };
  }
}
