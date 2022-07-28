import { Job, RecurrenceRule, scheduleJob } from 'node-schedule';
import { parseDate } from '../../src/common/common';
import { log } from '../util';

export class Schedule {
  private startJob: Job | undefined;
  private endJob: Job | undefined;
  private readonly onStart: () => Promise<void> | void;
  private readonly onEnd: () => Promise<void> | void;

  constructor(
    startTime: string | undefined,
    endTime: string | undefined,
    onStart: () => Promise<void> | void,
    onEnd: () => Promise<void> | void,
  ) {
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.startJob = Schedule.createJob(Schedule.createRule(startTime), this.onStart);
    this.endJob = Schedule.createJob(Schedule.createRule(endTime), this.onEnd);
  }

  private static createRule(str: string | undefined) {
    const date = parseDate(str);
    if (!date) return undefined;

    const rule = new RecurrenceRule();
    rule.second = 0;
    rule.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    rule.dayOfWeek = [1, 2, 3, 4, 5];
    rule.hour = date.getHours();
    rule.minute = date.getMinutes();

    return rule;
  }

  private static createJob(
    rule: RecurrenceRule | undefined,
    onExecute: () => Promise<void> | void,
  ): Job | undefined {
    if (rule) return scheduleJob(rule, onExecute);
    else return undefined;
  }

  public nextStart(): Date | undefined {
    return this.startJob?.nextInvocation();
  }

  public nextEnd(): Date | undefined {
    return this.endJob?.nextInvocation();
  }

  public reschedule(startDate?: string, endDate?: string) {
    let changed = false;
    if (startDate) {
      const res = this.rescheduleOne(startDate, this.startJob, x => (this.startJob = x));
      if (res) {
        log.info(
          `Schedule start changed to ${startDate}. Next invocation at `,
          this.startJob?.nextInvocation().toISOString(),
        );
      }
      changed ||= res;
    }
    if (endDate) {
      const res = this.rescheduleOne(endDate, this.endJob, x => (this.endJob = x));
      if (res) {
        log.info(
          `Schedule end changed to ${endDate}. Next invocation at `,
          this.endJob?.nextInvocation().toISOString(),
        );
      }
      changed ||= res;
    }
    return changed;
  }

  public rescheduleOne(
    date: string,
    job: Job | undefined,
    setJob: (job: Job | undefined) => void,
  ) {
    const rule = Schedule.createRule(date);
    if (rule) {
      if (job) {
        return job.reschedule(rule);
      } else {
        setJob(Schedule.createJob(rule, this.onStart));
        return true;
      }
    }
    log.error('Failed to create rule from ', date);
    return false;
  }
}
