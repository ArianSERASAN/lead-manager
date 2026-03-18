import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db, auth } from './firebase'
import { Login } from './components/Login'
import { LeadTable } from './components/LeadTable'
import { LeadDetail } from './components/LeadDetail'
import { ExportButton } from './components/ExportButton'
import { FilterBar } from './components/FilterBar'
import { ConfirmModal } from './components/ConfirmModal'
import { ToastContainer } from './components/Toast'
import { SelectionHUD } from './components/SelectionHUD'
import { useLeads } from './hooks/useLeads'
import { Lead } from './types'
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Download, 
  LogOut, 
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
  Trash2,
  Filter,
  Check
} from 'lucide-react'

function App() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'landing' | 'web-download' | 'web-contact'>('dashboard')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  
  // UX States
  const [toasts, setToasts] = useState<any[]>([])
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, message: string } | null>(null)
  
  const pendingDeletes = useRef<Map<string, any>>(new Map());
  const { leads, loading: leadsLoading } = useLeads()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const addToast = (message: string, type: 'success' | 'error' | 'undo', id?: string) => {
    const toastId = id || Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id: toastId, message, type }]);
    return toastId;
  }

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleLogout = () => signOut(auth)

  const getCollectionName = (lead: Lead) => {
    return lead.source === 'landing' ? 'leads' : 
           lead.source === 'web-download' ? 'leads_descargas' : 
           'solicitudes_contacto';
  }

  const handleUpdateStatus = async (id: string, status: Lead['status']) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      await updateDoc(doc(db, getCollectionName(lead), id), { status });
      addToast(`Estado actualizado a ${status}`, 'success');
    } catch (err) {
      addToast('Error al actualizar estado', 'error');
    }
  }

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      await updateDoc(doc(db, getCollectionName(lead), id), { notes });
      addToast('Notas guardadas', 'success');
    } catch (err) {
      addToast('Error al guardar notas', 'error');
    }
  }

  const handleBulkStatusUpdate = async (status: Lead['status']) => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        const lead = leads.find(l => l.id === id);
        if (lead) {
           await updateDoc(doc(db, getCollectionName(lead), id), { status });
        }
      }
      setSelectedIds([]);
      addToast(`${selectedIds.length} leads actualizados`, 'success');
    } catch (err) {
      addToast('Error en actualización masiva', 'error');
    }
  }

  const handleDelete = (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar lead?',
      message: `Esta acción ocultará a ${lead.name} y lo borrará permanentemente en 5 segundos.`,
      onConfirm: () => {
        const timeout = setTimeout(async () => {
          try {
            await deleteDoc(doc(db, getCollectionName(lead), id));
            pendingDeletes.current.delete(id);
            addToast(`${lead.name} eliminado definitivamente`, 'success');
          } catch (err) {
            addToast('Error al eliminar', 'error');
          }
        }, 5000);

        pendingDeletes.current.set(id, { timeout, lead });
        addToast(`Eliminando a ${lead.name}...`, 'undo', id);
        if (selectedLead?.id === id) setSelectedLead(null);
        setSelectedIds(prev => prev.filter(i => i !== id));
      }
    });
  }

  const handleUndoDelete = (id: string) => {
    const pending = pendingDeletes.current.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingDeletes.current.delete(id);
      addToast('Acción cancelada', 'success');
      removeToast(id);
    }
  }

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar seleccionados?',
      message: `Vas a eliminar ${selectedIds.length} leads. Esta acción NO se puede deshacer de forma masiva.`,
      onConfirm: async () => {
        try {
          for (const id of selectedIds) {
            const lead = leads.find(l => l.id === id);
            if (lead) await deleteDoc(doc(db, getCollectionName(lead), id));
          }
          setSelectedIds([]);
          addToast(`${selectedIds.length} leads eliminados`, 'success');
        } catch (err) {
          addToast('Error al eliminar leads', 'error');
        }
      }
    });
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  // Improved Filtering Logic
  const filteredLeads = leads.filter(lead => {
    if (pendingDeletes.current.has(lead.id)) return false;

    if (activeTab !== 'dashboard' && lead.source !== activeTab) return false;
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (activeTab === 'dashboard' && sourceFilter !== 'all' && lead.source !== sourceFilter) return false;

    if (dateFilter !== 'all') {
      const now = new Date();
      const leadDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date();
      const diffTime = Math.abs(now.getTime() - leadDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === 'today' && diffDays > 1) return false;
      if (dateFilter === 'yesterday' && (diffDays < 1 || diffDays > 2)) return false;
      if (dateFilter === 'week' && diffDays > 7) return false;
      if (dateFilter === 'month' && diffDays > 30) return false;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        lead.name.toLowerCase().includes(search) ||
        lead.email.toLowerCase().includes(search) ||
        (lead.phone || '').toLowerCase().includes(search) ||
        (lead.company || '').toLowerCase().includes(search) ||
        (lead.notes || '').toLowerCase().includes(search) ||
        Object.values(lead.data || {}).some(val => String(val).toLowerCase().includes(search))
      );
    }

    return true;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'nuevo').length,
    inProgress: leads.filter(l => l.status === 'en-progreso').length,
    closed: leads.filter(l => l.status === 'cerrado').length
  }

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-100 hidden md:block">
          <div className="flex items-center space-x-3 mb-1">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
             <h1 className="text-lg font-bold text-gray-900 tracking-tight">Lead Manager</h1>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SERASAN Engineering</p>
        </div>
        
        <nav className="flex-1 p-4 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Panel Global', icon: LayoutDashboard },
            { id: 'web-download', label: 'Descargas PDF', icon: Download },
            { id: 'web-contact', label: 'Contactos Web', icon: MessageSquare },
            { id: 'landing', label: 'Leads Landing', icon: Users },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal mb-1 ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 hidden md:block">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                {activeTab === 'dashboard' ? 'Panel de Control' : 
                 activeTab === 'web-download' ? 'Descargas de Guías' :
                 activeTab === 'web-contact' ? 'Solicitudes de Contacto' : 'Leads de la Landing'}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                 <Clock size={14} />
                 <span>{leads.length} leads encontrados</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
               <div className="hidden sm:flex items-center space-x-3 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm ml-auto">
                  <div className="px-4 py-1.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Admin</p>
                      <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{user.email}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold border-2 border-white">
                      {user.email?.[0].toUpperCase()}
                  </div>
               </div>
            </div>
          </header>

          <FilterBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sourceFilter={sourceFilter}
            onSourceChange={setSourceFilter}
            dateFilter={dateFilter}
            onDateChange={setDateFilter}
            leads={leads}
            activeTab={activeTab}
          />

          {/* Stats Cards */}
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Leads" value={stats.total} icon={TrendingUp} color="blue" />
                <StatCard label="Nuevos" value={stats.new} icon={Clock} color="orange" />
                <StatCard label="En Progreso" value={stats.inProgress} icon={Loader2} color="purple" />
                <StatCard label="Cerrados" value={stats.closed} icon={CheckCircle2} color="green" />
              </div>

              {/* Origin Breakdown */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-10">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">Distribución por Origen</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(leads.reduce((acc, current) => {
                    acc[current.source] = (acc[current.source] || 0) + 1;
                    return acc;
                  }, {} as any)).map(([source, count]: any) => (
                    <div key={source} className="space-y-2">
                       <div className="flex justify-between items-end">
                         <span className="text-xs font-bold text-gray-600 capitalize">{source.replace('-', ' ')}</span>
                         <span className="text-sm font-black text-gray-900">{count}</span>
                       </div>
                       <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${(count / leads.length) * 100}%` }}
                          />
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Leads Table */}
          {leadsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
               <Loader2 className="animate-spin text-blue-200 mb-4" size={48} />
               <p className="text-gray-400 font-medium">Cargando leads en tiempo real...</p>
            </div>
          ) : (
            <LeadTable 
              leads={filteredLeads} 
              selectedIds={selectedIds}
              onSelect={setSelectedLead} 
              onToggleSelection={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
              onToggleAll={(ids) => setSelectedIds(ids)}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetail 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
          onUpdateStatus={handleUpdateStatus}
          onUpdateNotes={handleUpdateNotes}
          onDelete={handleDelete}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal 
          {...confirmModal}
          onClose={() => setConfirmModal(null)}
        />
      )}

      <SelectionHUD 
        selectedLeads={leads.filter(l => selectedIds.includes(l.id))}
        onClear={() => setSelectedIds([])}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkDelete={handleDeleteSelected}
      />

      {/* Toasts */}
      <ToastContainer 
        toasts={toasts}
        onClose={removeToast}
        onUndo={handleUndoDelete}
      />
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: 'blue' | 'orange' | 'purple' | 'green' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    green: 'bg-green-50 text-green-600 border-green-100',
  }

  return (
    <div className={`p-6 bg-white rounded-3xl border border-gray-100 shadow-sm shadow-blue-900/5 flex flex-col transition-all hover:shadow-md`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${colors[color]}`}>
        <Icon size={20} className={color === 'purple' ? 'animate-spin-slow' : ''} />
      </div>
      <div className="text-3xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</div>
    </div>
  )
}

export default App
