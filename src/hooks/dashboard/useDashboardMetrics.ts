import { useMemo } from 'react';
import { Lead, LeadStatus, toJSDate } from '../../types/domain';
import { daysSince, getTimestampSeconds } from '../../utils/format';

export interface SourceROI {
  source: string;
  label: string;
  total: number;
  closed: number;
  conversionRate: number;
  avgScore: number;
}

export interface WeekOverWeek {
  current: number;
  previous: number;
  change: number; // percentage change
}

export interface DashboardMetrics {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  conversionRate: number;
  avgScore: number;
  staleCount: number;
  newThisWeek: number;
  newThisMonth: number;
  weeklyTrend: { week: string; count: number; source: string }[];
  funnel: { stage: string; count: number; percentage: number }[];
  scoreDistribution: { range: string; count: number }[];
  sourceROI: SourceROI[];
  // New metrics
  avgTimeInStage: Record<string, number>; // stage → avg days
  unattendedCount: number; // nuevo > 24h with no status change
  weekOverWeek: {
    total: WeekOverWeek;
    newLeads: WeekOverWeek;
    closed: WeekOverWeek;
    conversionRate: WeekOverWeek;
  };
}

export interface DateRange {
  start?: string;
  end?: string;
}

export function useDashboardMetrics(leads: Lead[], dateRange?: DateRange): DashboardMetrics {
  return useMemo(() => {
    // Filter leads by date range if provided
    let filteredLeads = leads;
    if (dateRange?.start || dateRange?.end) {
      const startDate = dateRange.start ? new Date(dateRange.start) : new Date(0);
      const endDate = dateRange.end ? new Date(dateRange.end) : new Date();

      filteredLeads = leads.filter(lead => {
        const leadDate = toJSDate(lead.createdAt);
        return leadDate >= startDate && leadDate <= endDate;
      });
    }

    // Basic metrics
    const total = filteredLeads.length;
    const closed = filteredLeads.filter(l => l.status === 'cerrado').length;
    const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const avgScore = total > 0 ? Math.round(filteredLeads.reduce((sum, l) => sum + l.score, 0) / total) : 0;
    const staleCount = filteredLeads.filter(l => l.isStale).length;

    // By status
    const byStatus: Record<string, number> = {
      'nuevo': 0,
      'contactado': 0,
      'en-progreso': 0,
      'cerrado': 0
    };
    filteredLeads.forEach(lead => {
      byStatus[lead.status]++;
    });

    // By source
    const bySource: Record<string, number> = {};
    filteredLeads.forEach(lead => {
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    });

    // New this week/month
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const newThisWeek = filteredLeads.filter(lead => {
      const leadDate = toJSDate(lead.createdAt);
      return leadDate >= weekAgo;
    }).length;

    const newThisMonth = filteredLeads.filter(lead => {
      const leadDate = toJSDate(lead.createdAt);
      return leadDate >= monthAgo;
    }).length;

    // Weekly trend (last 8 weeks)
    const weeklyTrendMap: Record<string, Record<string, number>> = {};
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyTrendMap[weekKey] = {};
    }

    filteredLeads.forEach(lead => {
      const leadDate = toJSDate(lead.createdAt);
      const weekStart = new Date(leadDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (weeklyTrendMap[weekKey]) {
        weeklyTrendMap[weekKey][lead.source] = (weeklyTrendMap[weekKey][lead.source] || 0) + 1;
      }
    });

    const weeklyTrend = Object.entries(weeklyTrendMap).flatMap(([week, sources]) =>
      Object.entries(sources).map(([source, count]) => ({
        week: new Date(week).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        count,
        source
      }))
    );

    // Funnel
    const stages: LeadStatus[] = ['nuevo', 'contactado', 'en-progreso', 'cerrado'];
    let previousCount = total;
    const funnel = stages.map(stage => {
      const count = byStatus[stage];
      const percentage = previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;
      previousCount = count;
      return { stage, count, percentage };
    });

    // Score distribution
    const scoreDistribution = [
      { range: '0-20', count: 0 },
      { range: '20-40', count: 0 },
      { range: '40-60', count: 0 },
      { range: '60-80', count: 0 },
      { range: '80-100', count: 0 }
    ];

    filteredLeads.forEach(lead => {
      if (lead.score < 20) scoreDistribution[0].count++;
      else if (lead.score < 40) scoreDistribution[1].count++;
      else if (lead.score < 60) scoreDistribution[2].count++;
      else if (lead.score < 80) scoreDistribution[3].count++;
      else scoreDistribution[4].count++;
    });

    // Source ROI
    const sources = ['landing', 'web-download', 'web-contact', 'manual'] as const;
    const sourceLabels: Record<string, string> = {
      landing: 'Landing',
      'web-download': 'PDF Descarga',
      'web-contact': 'Web Contacto',
      manual: 'Manual',
    };

    const sourceROI = sources.map((source) => {
      const sourceLeads = filteredLeads.filter((l) => l.source === source);
      const closedCount = sourceLeads.filter((l) => l.status === 'cerrado').length;
      const totalCount = sourceLeads.length;
      const avgSourceScore = totalCount > 0 ? Math.round(sourceLeads.reduce((sum, l) => sum + l.score, 0) / totalCount) : 0;
      return {
        source,
        label: sourceLabels[source] || source,
        total: totalCount,
        closed: closedCount,
        conversionRate: totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0,
        avgScore: avgSourceScore,
      };
    }).filter((s) => s.total > 0);

    // ── Average time in each pipeline stage ──────────────────────────
    const stageDurations: Record<string, number[]> = {
      nuevo: [],
      contactado: [],
      'en-progreso': [],
    };

    filteredLeads.forEach((lead) => {
      const history = lead.stateHistory;
      if (!history || history.length === 0) return;
      for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        const nextEntry = history[i + 1];
        const from = entry.fromStatus;
        if (!stageDurations[from]) return;
        const start = new Date(entry.timestamp).getTime();
        const end = nextEntry ? new Date(nextEntry.timestamp).getTime() : Date.now();
        const days = (end - start) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days < 365) stageDurations[from].push(days);
      }
    });

    const avgTimeInStage: Record<string, number> = {};
    for (const [stage, durations] of Object.entries(stageDurations)) {
      avgTimeInStage[stage] = durations.length > 0
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
        : 0;
    }

    // ── Unattended leads (nuevo > 24h, no status change) ────────────
    const oneDayMs = 24 * 60 * 60 * 1000;
    const unattendedCount = filteredLeads.filter((lead) => {
      if (lead.status !== 'nuevo') return false;
      const age = Date.now() - toJSDate(lead.createdAt).getTime();
      if (age < oneDayMs) return false;
      return !lead.stateHistory || lead.stateHistory.length === 0;
    }).length;

    // ── Week-over-week comparison ───────────────────────────────────
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(thisWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const thisWeekLeads = filteredLeads.filter((l) => toJSDate(l.createdAt) >= thisWeekStart);
    const prevWeekLeads = filteredLeads.filter((l) => {
      const d = toJSDate(l.createdAt);
      return d >= prevWeekStart && d < thisWeekStart;
    });

    function computeWoW(current: number, previous: number): WeekOverWeek {
      const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
      return { current, previous, change };
    }

    const thisWeekClosed = thisWeekLeads.filter((l) => l.status === 'cerrado').length;
    const prevWeekClosed = prevWeekLeads.filter((l) => l.status === 'cerrado').length;
    const thisWeekConv = thisWeekLeads.length > 0 ? Math.round((thisWeekClosed / thisWeekLeads.length) * 100) : 0;
    const prevWeekConv = prevWeekLeads.length > 0 ? Math.round((prevWeekClosed / prevWeekLeads.length) * 100) : 0;

    const weekOverWeek = {
      total: computeWoW(total, total), // total doesn't have WoW, placeholder
      newLeads: computeWoW(thisWeekLeads.length, prevWeekLeads.length),
      closed: computeWoW(thisWeekClosed, prevWeekClosed),
      conversionRate: computeWoW(thisWeekConv, prevWeekConv),
    };

    return {
      total,
      byStatus,
      bySource,
      conversionRate,
      avgScore,
      staleCount,
      newThisWeek,
      newThisMonth,
      weeklyTrend,
      funnel,
      scoreDistribution,
      sourceROI,
      avgTimeInStage,
      unattendedCount,
      weekOverWeek,
    };
  }, [leads, dateRange]);
}
