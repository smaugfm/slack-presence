import isURL from 'validator/lib/isURL';
import dayjs, { Dayjs } from 'dayjs';

export type Options = {
  enabled: boolean;
  intervalMinutes: number;
  slackUrl: string;
  userDataDir: string;

  start?: string;
  end?: string;
};

export type WsServerMessage =
  | {
      type: 'status';
      status: PresenceStatus;
    }
  | {
      type: 'settings';
      settings: Settings;
    };

export type WsClientMessage =
  | {
      type: 'initial';
      dummy1: number;
    }
  | {
      type: 'dummy';
      dummy2: number;
    };

export type Settings = Pick<Options, 'enabled' | 'slackUrl' | 'start' | 'end'>;

export function formatDate(time: Dayjs) {
  return time.format('HH:mm');
}

export function isUrlValid(url: string) {
  return isURL(url, {
    protocols: ['https'],
    require_protocol: true,
    host_whitelist: [/\S+\.slack.com$/],
  });
}

export function parseDate(s?: string): Dayjs | undefined {
  if (!s) return undefined;

  const hours = parseInt(s.split(':')[0]);
  const minutes = parseInt(s.split(':')[1]);
  if (isNaN(hours) || isNaN(minutes)) return undefined;
  const d = new Date(0);
  d.setHours(hours, minutes, 0, 0);
  return dayjs(d);
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForCondition(
  condition: (iteration: number) => Promise<boolean> | boolean,
  ms?: number,
  spinWaitDelay = 200,
): Promise<boolean> {
  let isTimeout = false;
  if (ms !== undefined)
    setTimeout(() => {
      isTimeout = true;
    }, ms);
  let iteration = 0;
  while (!(await condition(iteration++)) && !isTimeout) {
    await delay(spinWaitDelay);
  }

  return !isTimeout;
}

export type PresenceStatus =
  | {
      status: 'inactive';
    }
  | {
      status: 'loading';
    }
  | {
      status: 'active';
      name?: string;
      avatarUrl?: string;
      avatarUrl2x?: string;
      endISOTime?: string;
    }
  | {
      status: 'needsReLogin';
    }
  | {
      status: 'outOfSchedule';
      startISOTime: string | undefined;
    }
  | {
      status: 'failedToLoad';
    };
