import { formatDate } from '../../common/common';
import { useMemo } from 'react';

enum DaysDiff {
  Past,
  Today,
  Tomorrow,
  More,
}

export function useRelativeDateTime(target: Date | undefined, prepositions = true) {
  return useMemo(() => {
    if (!target) return undefined;

    const now = new Date();
    const diff = daysBetween(now, target);
    const at = prepositions ? 'at ' : '';
    const on = prepositions ? 'on ' : '';
    switch (diff) {
      case DaysDiff.Past:
        console.error('Invocation time must be in the future. ', target);
        return undefined;
      case DaysDiff.Today:
        return `${at}${formatDate(target)}`;
      case DaysDiff.Tomorrow:
        return `tomorrow ${at}${formatDate(target)}`;
      case DaysDiff.More:
        return `${on}${getDayOfTheWeekStr(target.getDay())} ${at}${formatDate(target)}`;
    }
  }, [prepositions, target]);
}

function daysBetween(x: Date, y: Date): DaysDiff {
  if (y < x) return DaysDiff.Past;
  if (checkDatesMatch(x, y)) return DaysDiff.Today;
  if (checkDatesMatch(addDays(x, 1), y)) return DaysDiff.Tomorrow;
  return DaysDiff.More;
}

function checkDatesMatch(x: Date, y: Date) {
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

function addDays(date: Date, days: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function getDayOfTheWeekStr(day: number) {
  switch (day) {
    case 0:
      return 'Sunday';
    case 1:
      return 'Monday';
    case 2:
      return 'Tuesday';
    case 3:
      return 'Wednesday';
    case 4:
      return 'Thursday';
    case 5:
      return 'Friday';
    case 6:
      return 'Saturday';
  }
}
