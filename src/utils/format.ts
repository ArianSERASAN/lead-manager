import { formatDistanceToNow, format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatTimestamp(ts: any): string {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  if (isToday(date)) return `Hoy, ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Ayer, ${format(date, 'HH:mm')}`;
  return format(date, "d MMM yyyy", { locale: es });
}

export function formatRelativeTime(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

export function formatFullDate(ts: any): string {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

export function getTimestampSeconds(ts: any): number {
  if (!ts) return 0;
  if (ts.seconds) return ts.seconds;
  if (ts instanceof Date) return Math.floor(ts.getTime() / 1000);
  if (typeof ts === 'string') return Math.floor(new Date(ts).getTime() / 1000);
  return 0;
}

export function daysSince(ts: any): number {
  if (!ts) return 999;
  const date = ts.toDate ? ts.toDate() : new Date(ts);
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
