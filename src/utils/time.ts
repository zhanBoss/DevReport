import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import type { TimeRangePreset, ReportType } from '@/types';

dayjs.extend(quarterOfYear);

export const getTimeRangeByType = (
  reportType: ReportType,
  crossDay: boolean
): { since: string; until: string } => {
  const now = dayjs();
  let since: dayjs.Dayjs;
  let until: dayjs.Dayjs = now;

  switch (reportType) {
    case 'daily':
      if (crossDay) {
        since = now.subtract(1, 'day').startOf('day');
      } else {
        since = now.startOf('day');
      }
      break;
    case 'weekly':
      since = now.startOf('week');
      break;
    case 'monthly':
      since = now.startOf('month');
      break;
    case 'quarterly':
      since = now.startOf('quarter');
      break;
    case 'yearly':
      since = now.startOf('year');
      break;
    default:
      since = now.startOf('day');
  }

  return {
    since: since.format('YYYY-MM-DD HH:mm:ss'),
    until: until.format('YYYY-MM-DD HH:mm:ss'),
  };
};

export const getTimeRange = (
  preset: TimeRangePreset,
  crossDay: boolean,
  customSince?: string,
  customUntil?: string
): { since: string; until: string } => {
  const now = dayjs();
  let since: dayjs.Dayjs;
  let until: dayjs.Dayjs = now;

  switch (preset) {
    case 'today':
      if (crossDay) {
        since = now.subtract(1, 'day').startOf('day');
      } else {
        since = now.startOf('day');
      }
      break;
    case 'yesterday':
      since = now.subtract(1, 'day').startOf('day');
      until = now.subtract(1, 'day').endOf('day');
      break;
    case 'this_week':
      since = now.startOf('week');
      break;
    case 'this_month':
      since = now.startOf('month');
      break;
    case 'this_quarter':
      since = now.startOf('quarter');
      break;
    case 'this_year':
      since = now.startOf('year');
      break;
    case 'custom':
      since = customSince ? dayjs(customSince) : now.startOf('day');
      until = customUntil ? dayjs(customUntil) : now;
      break;
    default:
      since = now.startOf('day');
  }

  return {
    since: since.format('YYYY-MM-DD HH:mm:ss'),
    until: until.format('YYYY-MM-DD HH:mm:ss'),
  };
};

export const formatDate = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

export const formatDateShort = (date: string): string => {
  return dayjs(date).format('MM-DD HH:mm');
};
