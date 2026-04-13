import { useLeadStore } from '../../stores/useLeadStore';

export function useLeads() {
  const leads = useLeadStore((state) => state.leads);
  const loading = useLeadStore((state) => state.loading);
  const hasMore = useLeadStore((state) => state.hasMore);
  const loadingMore = useLeadStore((state) => state.loadingMore);
  const loadMore = useLeadStore((state) => state.loadMore);

  return { leads, loading, hasMore, loadMore, loadingMore };
}
