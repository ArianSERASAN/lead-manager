import { formatDistanceToNow, format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { TimestampLike, toJSDate } from '../types/domain';

export function formatTimestamp(ts: TimestampLike): string {
  if (!ts) return '—';
  const date = toJSDate(ts);
  if (isToday(date)) return `Hoy, ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Ayer, ${format(date, 'HH:mm')}`;
  return format(date, "d MMM yyyy", { locale: es });
}

export function formatRelativeTime(ts: TimestampLike): string {
  if (!ts) return '';
  const date = toJSDate(ts);
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

export function formatFullDate(ts: TimestampLike): string {
  if (!ts) return '—';
  const date = toJSDate(ts);
  return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

export function getTimestampSeconds(ts: TimestampLike): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && 'seconds' in ts && typeof (ts as { seconds: number }).seconds === 'number') {
    return (ts as { seconds: number }).seconds;
  }
  return Math.floor(toJSDate(ts).getTime() / 1000);
}

export function daysSince(ts: TimestampLike): number {
  if (!ts) return 999;
  const date = toJSDate(ts);
  return differenceInDays(new Date(), date);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-gray-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-blue-50 border-blue-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-gray-50 border-gray-200';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Caliente';
  if (score >= 60) return 'Templado';
  if (score >= 40) return 'Tibio';
  return 'Frío';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
