import { createSimpleLogger } from "simple-node-logger";
import { Page } from "puppeteer";
import { RecurrenceRule, scheduleJob } from "node-schedule";
import { Options } from "./main";
import { promises as fs } from "fs";
import { t } from "i18next";
import { t } from "i18next";

export const log = createSimpleLogger();
export const chromeDebugPort = 9222;

export function takeScreenshot(page: Page): Promise<Buffer> {
  const now = new Date().toISOString();
  return page.screenshot({ type: "png", encoding: "binary" }) as Promise<Buffer>;
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatTime(hour?: number, minute?: number) {
  const pad = (n: number) =>
    n.toLocaleString("en", {
      minimumIntegerDigits: 2,
      maximumFractionDigits: 0,
      useGrouping: false,
    });
  return `${pad(hour || 0)}:${pad(minute || 0)}`;
}

export function createSchedule(options: Options, sendMessage: (msg: string) => Promise<any>) {
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
    scheduleJob(startRule, async () => {
      options.stop = false;
      await sendMessage(
        t("commands.start", {
          displayUrl: new URL(options.slackUrl).hostname.replaceAll(".", "\\."),
          start: formatTime(options.startHour, options.startMinute),
          end: formatTime(options.stopHour, options.stopMinute),
        }),
      );
    }),
    scheduleJob(stopRule, async () => {
      options.stop = true;
      await sendMessage("commands.stop");
    }),
  ];
}

export function writeOptions(path: string, options: Partial<Options>) {
  return fs.writeFile(path, JSON.stringify(options, null, 2));
}

export const masterChatId = parseInt(process.env.MASTER_CHAT_ID as string, 10);

const defaultOptions: Options = {
  stop: false,
  intervalMinutes: 2,
  slackUrl: "https://app.slack.com",
  userDataDir: "chrome",
  startHour: 8,
  startMinute: 0,
  stopHour: 16,
  stopMinute: 0,
};

export async function readOptions(path: string): Promise<Options> {
  try {
    const options = JSON.parse((await fs.readFile(path)).toString("utf-8")) as Partial<Options>;

    return {
      ...defaultOptions,
      ...options,
    };
  } catch {
    return defaultOptions;
  }
}
