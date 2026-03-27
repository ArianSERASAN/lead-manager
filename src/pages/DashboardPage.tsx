import { useState } from 'react';
import { Header } from '../components/Layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/leads/useLeads';
import { useDashboardMetrics } from '../hooks/dashboard/useDashboardMetrics';
import { StatsCards } from '../components/Dashboard/StatsCards';
import { TrendChart } from '../components/Dashboard/TrendChart';
import { FunnelChart } from '../components/Dashboard/FunnelChart';
import { SourceChart } from '../components/Dashboard/SourceChart';
import { ScoreDistributionChart } from '../components/Dashboard/ScoreDistributionChart';
import { StaleLeadsWidget } from '../components/Dashboard/StaleLeadsWidget';
import { useFilterLogic } from '../hooks/filtering/useFilterLogic';

export function DashboardPage() {
  const { appUser } = useAuth();
  const { leads, loading } = useLeads();
  const [dateRangeFilter, setDateRangeFilter] = useState<'7' | '30' | '90' | 'all'>('all');

  const dateRanges = {
    '7': { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    '30': { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    '90': { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    'all': {}
  };

  const metrics = useDashboardMetrics(leads, dateRanges[dateRangeFilter]);

  // For stale leads filter
  const { setStatusFilter } = useFilterLogic(leads);

  if (loading) {
    return (
      <>
        <Header title="Dashboard" user={appUser} />
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-40">
                <div className="skeleton w-11 h-11 mb-4" />
                <div className="skeleton w-20 h-3 mb-2" />
                <div className="skeleton w-16 h-8" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 h-72">
              <div className="skeleton w-32 h-4 mb-4" />
              <div className="skeleton w-full h-48" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 h-72">
              <div className="skeleton w-24 h-4 mb-4" />
              <div className="skeleton w-full h-48" />
            </div>
          </div>
        </div>
      </>
    );
  }

  const handleViewAllStale = () => {
    // Navigate to leads with stale filter
    const staleWindow = window.open('/#/', '_blank');
    if (staleWindow) {
      // This would need to be handled through state management or context
      // For now, we'll just open the leads page
    }
  };

  return (
    <>
      <Header title="Dashboard" user={appUser} />

      <div className="space-y-8 page-enter">
        {/* Date Range Selector */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setDateRangeFilter('7')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              dateRangeFilter === '7'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 días
          </button>
          <button
            onClick={() => setDateRangeFilter('30')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              dateRangeFilter === '30'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 días
          </button>
          <button
            onClick={() => setDateRangeFilter('90')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              dateRangeFilter === '90'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            90 días
          </button>
          <button
            onClick={() => setDateRangeFilter('all')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              dateRangeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todo
          </button>
        </div>

        {/* Row 1: Stats Cards */}
        <StatsCards
          total={metrics.total}
          conversionRate={metrics.conversionRate}
          avgScore={metrics.avgScore}
          staleCount={metrics.staleCount}
          newThisWeek={metrics.newThisWeek}
        />

        {/* Row 2: Trend Chart + Source Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TrendChart data={metrics.weeklyTrend} />
          </div>
          <div className="lg:col-span-1">
            <SourceChart data={metrics.bySource} />
          </div>
        </div>

        {/* Row 3: Funnel + Score Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FunnelChart data={metrics.funnel} />
          <ScoreDistributionChart data={metrics.scoreDistribution} />
        </div>

        {/* Row 4: Stale Leads Widget */}
        <StaleLeadsWidget leads={leads} onViewAll={handleViewAllStale} />
      </div>
    </>
  );
}
