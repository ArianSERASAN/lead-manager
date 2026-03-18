import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import { Login } from './components/Login'
import { LeadTable } from './components/LeadTable'
import { LeadDetail } from './components/LeadDetail'
import { FilterBar } from './components/FilterBar'
import { ConfirmModal } from './components/ConfirmModal'
import { ToastContainer } from './components/Toast'
import { SelectionHUD } from './components/SelectionHUD'
import { useLeads } from './hooks/useLeads'
import { useLeadActions } from './hooks/useLeadActions'
import { useFilterLogic } from './hooks/useFilterLogic'
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
  Filter
} from 'lucide-react'

function App() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Custom Hooks for Logic
  const { leads, loading: leadsLoading } = useLeads()
  const [toasts, setToasts] = useState<any[]>([])
  
  const addToast = (toast: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, ...toast }]);
    return id;
  }

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // 1. Filter Logic Hook
  const {
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sourceFilter, setSourceFilter,
    dateFilter, setDateFilter,
    filteredLeads
  } = useFilterLogic(leads);

  // 2. Action Logic Hook
  const {
    updateLeadStatus,
    updateLeadNotes,
    deleteLead,
    bulkStatusUpdate,
    bulkDelete
  } = useLeadActions(leads, addToast, () => setSelectedIds([]));

  // 3. UX States
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, message: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = () => signOut(auth)

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

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'nuevo').length,
    inProgress: leads.filter(l => l.status === 'en-progreso').length,
    closed: leads.filter(l => l.status === 'cerrado').length
  }

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden font-sans">
      {/* Sidebar - Glassmorphism ready */}
      <aside className="w-full md:w-72 bg-white/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-gray-200/50 flex flex-col shrink-0 z-20">
        <div className="p-8 border-b border-gray-100/50 hidden md:block">
          <div className="flex items-center space-x-3 mb-1">
             <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20">L</div>
             <h1 className="text-xl font-black text-gray-900 tracking-tight">Lead Manager</h1>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">SERASAN Engineering</p>
        </div>
        
        <nav className="flex-1 p-4 md:p-6 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar gap-2">
          {[
            { id: 'all', label: 'Panel Global', icon: LayoutDashboard },
            { id: 'descargas', label: 'Descargas PDF', icon: Download },
            { id: 'contactos', label: 'Contactos Web', icon: MessageSquare },
            { id: 'landing', label: 'Leads Landing', icon: Users },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center space-x-4 w-full px-5 py-3.5 rounded-2xl transition-all duration-300 group whitespace-nowrap md:whitespace-normal ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white font-bold shadow-xl shadow-blue-600/30 -translate-y-0.5' 
                  : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 active:scale-95'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
              <span className="text-[15px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-100/50 hidden md:block">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-5 py-4 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all font-bold group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Full Width Transformation */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative scroll-smooth">
        <div className="w-full px-4 md:px-12 py-10">
          <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-6">
            <div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">
                {activeTab === 'all' ? 'Panel de Control' : 
                 activeTab === 'descargas' ? 'Descargas de Guías' :
                 activeTab === 'contactos' ? 'Solicitudes de Contacto' : 'Leads de la Landing'}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mt-2 font-medium">
                 <div className="flex -space-x-1">
                    <div className="w-5 h-5 bg-blue-100 rounded-full border border-white" />
                    <div className="w-5 h-5 bg-blue-200 rounded-full border border-white" />
                    <div className="w-5 h-5 bg-blue-300 rounded-full border border-white" />
                 </div>
                 <span className="pl-1"><span className="text-blue-600 font-bold">{filteredLeads.length}</span> leads filtrados</span>
              </div>
            </div>

            <div className="flex items-center space-x-4 w-full xl:w-auto">
               <div className="hidden sm:flex items-center space-x-4 bg-white/60 backdrop-blur-md p-2 rounded-[24px] border border-white shadow-sm ml-auto">
                  <div className="pl-4 pr-2">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none mb-0.5">Admin Account</p>
                      <p className="text-xs font-bold text-gray-900">{user.email}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-900 rounded-[20px] flex items-center justify-center text-white font-black shadow-lg shadow-gray-900/10">
                      {user.email?.[0].toUpperCase()}
                  </div>
               </div>
            </div>
          </header>

          <FilterBar 
            searchTerm={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sourceFilter={sourceFilter}
            onSourceChange={setSourceFilter}
            dateFilter={dateFilter}
            onDateChange={setDateFilter}
            leads={leads}
            activeTab={activeTab === 'all' ? 'dashboard' : activeTab}
          />

          {/* Stats Cards - Spatial/3D feel */}
          {activeTab === 'all' && (
            <>
              <div className="grid grid-cols-2 2xl:grid-cols-4 gap-6 mb-8">
                <StatCard label="Total Leads" value={stats.total} icon={TrendingUp} color="blue" />
                <StatCard label="Nuevos" value={stats.new} icon={Clock} color="orange" />
                <StatCard label="En Progreso" value={stats.inProgress} icon={Loader2} color="purple" />
                <StatCard label="Cerrados" value={stats.closed} icon={CheckCircle2} color="green" />
              </div>

              {/* Origin Breakdown - Expanded Width */}
              <div className="bg-white/70 backdrop-blur-sm p-8 rounded-[32px] border border-white shadow-xl shadow-blue-900/5 mb-12">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 px-1">Distribución Geográfica y Origen</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {Object.entries(leads.reduce((acc, current) => {
                    acc[current.source] = (acc[current.source] || 0) + 1;
                    return acc;
                  }, {} as any)).map(([source, count]: any) => (
                    <div key={source} className="group cursor-default">
                       <div className="flex justify-between items-end mb-3">
                         <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">{source.replace('-', ' ')}</span>
                         <span className="text-lg font-black text-gray-900 tracking-tight">{count}</span>
                       </div>
                       <div className="h-3 bg-gray-200/50 rounded-full overflow-hidden p-0.5 border border-gray-100/50">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full shadow-lg shadow-blue-500/40 relative overflow-hidden" 
                            style={{ width: `${(count / leads.length) * 100}%` }}
                          >
                             <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Leads Table - Stretched to fill space */}
          <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-blue-900/5 border border-white/50">
            {leadsLoading ? (
              <div className="flex flex-col items-center justify-center py-32">
                 <div className="relative">
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={56} />
                    <div className="absolute inset-0 blur-xl bg-blue-400/20" />
                 </div>
                 <p className="text-gray-400 font-bold tracking-widest uppercase text-[10px]">Cargando bases de datos...</p>
              </div>
            ) : (
              <LeadTable 
                leads={filteredLeads} 
                selectedIds={selectedIds}
                onSelect={setSelectedLead} 
                onToggleSelection={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                onToggleAll={(ids) => setSelectedIds(ids)}
                onDelete={(id) => {
                  setConfirmModal({
                    isOpen: true,
                    title: '¿Confirmar eliminación?',
                    message: 'El lead será eliminado permanentemente. Tienes 5 segundos para deshacer en caso de error.',
                    onConfirm: () => deleteLead(id)
                  })
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* Modals & Overlays */}
      {selectedLead && (
        <LeadDetail 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
          onUpdateStatus={(id, status) => updateLeadStatus(id, status)}
          onUpdateNotes={(id, notes) => updateLeadNotes(id, notes)}
          onDelete={(id) => {
             setConfirmModal({
                isOpen: true,
                title: '¿Borrar este Lead?',
                message: 'Perderás el historial y las notas de seguimiento de este cliente.',
                onConfirm: () => {
                  deleteLead(id);
                  setSelectedLead(null);
                }
             })
          }}
        />
      )}

      {confirmModal && (
        <ConfirmModal 
          {...confirmModal}
          onClose={() => setConfirmModal(null)}
        />
      )}

      <SelectionHUD 
        selectedLeads={leads.filter(l => selectedIds.includes(l.id))}
        onClear={() => setSelectedIds([])}
        onBulkStatusUpdate={(status) => bulkStatusUpdate(selectedIds, status)}
        onBulkDelete={() => {
           setConfirmModal({
              isOpen: true,
              title: `¿Borrar ${selectedIds.length} leads?`,
              message: 'Esta acción eliminará todos los registros seleccionados definitivamente de la base de datos.',
              onConfirm: () => bulkDelete(selectedIds)
           })
        }}
      />

      <ToastContainer 
        toasts={toasts}
        onClose={removeToast}
        onUndo={(id) => {
           console.log('Undo in Progress for:', id);
           removeToast(id);
        }}
      />
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: 'blue' | 'orange' | 'purple' | 'green' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-200/20',
    orange: 'bg-orange-50 text-orange-600 border-orange-100 shadow-orange-200/20',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 shadow-purple-200/20',
    green: 'bg-green-50 text-green-600 border-green-100 shadow-green-200/20',
  }

  return (
    <div className="p-8 bg-white/50 backdrop-blur-sm rounded-[32px] border border-white shadow-xl shadow-blue-900/5 group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center mb-6 border shadow-lg ${colors[color]}`}>
        <Icon size={26} className={color === 'purple' ? 'animate-spin-slow' : 'group-hover:scale-110 transition-transform'} />
      </div>
      <div className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-2">{value}</div>
      <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</div>
    </div>
  )
}

export default App
