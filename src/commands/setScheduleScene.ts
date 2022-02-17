import { parse } from "date-fns";
import { BaseScene, Stage, Telegraf } from "telegraf";
import { Context, Options } from "../main";
import { t } from "i18next";
import { formatTime } from "../util";

export function setupSetScheduleScene(
  bot: Telegraf<Context>,
  stage: Stage<Context>,
  saveOptions: (newOptions: Partial<Options>) => void,
) {
  function setTime(variant: "start" | "end", ctx: Context, time?: Date) {
    (ctx.scene.session.state as any)[variant] = time;
  }

  function getTime(variant: "start" | "end", ctx: Context): Date | undefined {
    return (ctx.scene.session.state as any)[variant];
  }

  const scene = new BaseScene("setSchedule");
  scene.enter(async ctx => {
    await ctx.reply(t("commands.setschedule.first"));
  });

  scene.leave(ctx => {
    setTime("start", ctx, undefined);
    setTime("end", ctx, undefined);
  });

  scene.hears(/\d{1,2}:\d{1,2}/, async ctx => {
    let time: Date;
    try {
      time = parse(ctx.message?.text!, "HH:mm", new Date());
    } catch (e) {
      await ctx.reply(t("commands.setschedule.invalidFormat"));
      await ctx.scene.leave();
      return;
    }

    if (!getTime("start", ctx)) {
      setTime("start", ctx, time);
      await ctx.reply(t("commands.setschedule.second"));
    } else if (!getTime("end", ctx)) {
      setTime("end", ctx, time);
      const startTime = getTime("start", ctx)!;

      const newOptions = {
        startHour: startTime.getHours(),
        startMinute: startTime.getMinutes(),
        stopHour: time.getHours(),
        stopMinute: time.getMinutes(),
      };
      await saveOptions(newOptions);

      await ctx.reply(
        t("commands.setschedule.third", {
          start: formatTime(newOptions.startHour, newOptions.startMinute),
          end: formatTime(newOptions.stopHour, newOptions.stopMinute),
        }),
        {
          parse_mode: "MarkdownV2",
        },
      );
      await ctx.scene.leave();
    }
  });

  stage.register(scene);
  bot.command("setschedule", ctx => ctx.scene.enter(scene.id));
}
