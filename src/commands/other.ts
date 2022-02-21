import { Telegraf } from "telegraf";
import { Context, Options } from "../main";
import { formatTime, takeScreenshot } from "../util";
import { Page } from "puppeteer";
import { t } from "i18next";

export function setupOtherCommands(
  bot: Telegraf<Context>,
  getPage: () => Page | undefined,
  getOptions: () => Options,
  saveOptions: (newOptions: Partial<Options>) => void,
) {
  bot.start(async ctx => {
    await saveOptions({ stop: false });
    const options = getOptions();
    await ctx.reply(
      t("commands.start", {
        url: options.slackUrl,
        displayUrl: new URL(options.slackUrl).hostname.replaceAll(".", "\\."),
        start: formatTime(options.startHour, options.startMinute),
        end: formatTime(options.stopHour, options.stopMinute),
      }),
      {
        parse_mode: "MarkdownV2",
      },
    );
  });

  bot.command("stop", async ctx => {
    await saveOptions({ stop: true });
    await ctx.reply(t("commands.stop"));
  });

  bot.command("clearschedule", async ctx => {
    await saveOptions({
      startHour: undefined,
      startMinute: undefined,
      stopHour: undefined,
      stopMinute: undefined,
    });

    await ctx.reply(t("commands.clearschedule"));
  });

  bot.command("screenshot", async ctx => {
    const page = getPage();
    if (page) {
      const screenShot = await takeScreenshot(page);
      await ctx.replyWithPhoto({ source: screenShot });
    } else {
      await ctx.reply(t("pageClosed"));
    }
  });
}
