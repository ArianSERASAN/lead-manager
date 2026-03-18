import { useState, useMemo } from 'react';
import { Lead } from '../types';

export function useFilterLogic(leads: Lead[]) {
  const [activeTab, setActiveTab] = useState<'all' | 'descargas' | 'contactos' | 'landing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Tab filter
      if (activeTab === 'descargas' && lead.source !== 'web-download') return false;
      if (activeTab === 'contactos' && lead.source !== 'web-contact') return false;
      if (activeTab === 'landing' && lead.source !== 'landing') return false;

      // Search query (Deep search in name, email, phone, company, and message)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        (lead.phone || '').toLowerCase().includes(searchLower) ||
        lead.company?.toLowerCase().includes(searchLower) ||
        lead.message?.toLowerCase().includes(searchLower) ||
        lead.notes?.toLowerCase().includes(searchLower) ||
        JSON.stringify(lead.data).toLowerCase().includes(searchLower);

      if (searchQuery && !matchesSearch) return false;

      // Status filter
      if (statusFilter && lead.status !== statusFilter) return false;

      // Source filter (Only relevant for "all" tab)
      if (activeTab === 'all' && sourceFilter && lead.source !== sourceFilter) return false;

      // Date filter
      if (dateFilter) {
        const leadDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (dateFilter === 'today') {
          if (leadDate < today) return false;
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (leadDate < yesterday || leadDate >= today) return false;
        } else if (dateFilter === 'week') {
          const aWeekAgo = new Date(today);
          aWeekAgo.setDate(aWeekAgo.getDate() - 7);
          if (leadDate < aWeekAgo) return false;
        } else if (dateFilter === 'month') {
          const aMonthAgo = new Date(today);
          aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);
          if (leadDate < aMonthAgo) return false;
        }
      }

      return true;
    });
  }, [leads, activeTab, searchQuery, statusFilter, sourceFilter, dateFilter]);

  return {
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sourceFilter, setSourceFilter,
    dateFilter, setDateFilter,
    filteredLeads
  };
}
