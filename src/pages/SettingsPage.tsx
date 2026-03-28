import { Users, Shield, UserPlus, Pencil, Check, X, ToggleLeft, ToggleRight, Loader2, AlertTriangle, Eye, EyeOff, Bell, Mail } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/leads/useLeads';
import { AppUser, UserRole } from '../types/domain';
import { RoleGuard } from '../components/User/RoleGuard';
import { useToast } from '../contexts/ToastContext';
import * as UserService from '../services/UserService';
import { AlertSettings } from '../components/Settings/AlertSettings';
import { EmailSequenceSettings } from '../components/Settings/EmailSequenceSettings';

const ROLE_OPTIONS: { value: UserRole; label: string; color: string; bgColor: string; description: string }[] = [
  { value: 'admin', label: 'Administrador', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', description: 'Acceso completo: gestión de usuarios, leads, configuración' },
  { value: 'comercial', label: 'Comercial', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', description: 'Puede editar y asignar leads, sin gestión de usuarios' },
  { value: 'read_only', label: 'Solo Lectura', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200', description: 'Solo visualización, sin permisos de edición' },
];

function getRoleConfig(role: UserRole) {
  return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[2];
}

export function SettingsPage() {
  const { appUser } = useAuth();
  const { leads } = useLeads();
  const { addToast } = useToast();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Real-time user list
  useEffect(() => {
    const unsub = UserService.subscribeToUsers((usersData) => {
      setUsers(usersData);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleRoleChange = useCallback(async (userId: string, newRole: UserRole) => {
    if (userId === appUser?.uid && newRole !== 'admin') {
      addToast({ message: 'No puedes quitarte el rol de admin a ti mismo', type: 'error' });
      return;
    }
    setUpdatingId(userId);
    try {
      await UserService.updateUserRole(userId, newRole);
      addToast({ message: 'Rol actualizado', type: 'success' });
    } catch (err) {
      addToast({ message: 'Error al actualizar rol', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  }, [appUser, addToast]);

  const handleToggleActive = useCallback(async (user: AppUser) => {
    if (user.uid === appUser?.uid) {
      addToast({ message: 'No puedes desactivarte a ti mismo', type: 'error' });
      return;
    }
    setUpdatingId(user.uid);
    try {
      await UserService.toggleUserActive(user.uid, !user.active);
      addToast({ message: user.active ? 'Usuario desactivado' : 'Usuario reactivado', type: 'success' });
    } catch (err) {
      addToast({ message: 'Error al cambiar estado', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  }, [appUser, addToast]);

  const handleSaveName = useCallback(async (userId: string) => {
    if (!editName.trim()) return;
    setUpdatingId(userId);
    try {
      await UserService.updateUserName(userId, editName.trim());
      addToast({ message: 'Nombre actualizado', type: 'success' });
      setEditingUser(null);
    } catch (err) {
      addToast({ message: 'Error al actualizar nombre', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  }, [editName, addToast]);

  const activeUsers = users.filter(u => u.active);
  const inactiveUsers = users.filter(u => !u.active);

  return (
    <>
      <Header title="Configuración" />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* App Info */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-6 animate-fade-in-up">
          <div className="flex items-start gap-3 sm:gap-5 mb-6 pb-6 border-b border-gray-100">
            <img src="/logos/serasan-logo.png" alt="SERASAN Engineering" className="h-10 sm:h-14 object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Lead Manager</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">v2.1.0</span>
                <span className="text-xs text-gray-400 truncate">SERASAN Engineering</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-emerald-50/80 rounded-xl border border-emerald-100">
            <img src="/logos/reactiva-icon.png" alt="Reactiva tu Edificio" className="w-5 h-5 object-contain" />
            <span className="text-xs font-bold text-emerald-700">Reactiva tu Edificio</span>
            <span className="text-xs text-emerald-600/60 ml-1">— Leads desde landing page</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Versión</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">2.1.0</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Leads</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{leads.length}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
              <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Usuarios</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{activeUsers.length}<span className="text-sm font-normal text-gray-400">/{users.length}</span></p>
            </div>
          </div>
        </div>

        {/* User Management */}
        <RoleGuard requires="canManageUsers">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-6 animate-fade-in-up">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                Gestión de Usuarios
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <UserPlus size={16} />
                <span className="hidden sm:inline">Añadir</span> Usuario
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Active Users */}
                <div className="space-y-2">
                  {activeUsers.map(user => (
                    <UserRow
                      key={user.uid}
                      user={user}
                      isCurrentUser={user.uid === appUser?.uid}
                      isEditing={editingUser === user.uid}
                      editName={editName}
                      isUpdating={updatingId === user.uid}
                      onEditStart={() => { setEditingUser(user.uid); setEditName(user.name); }}
                      onEditCancel={() => setEditingUser(null)}
                      onEditNameChange={setEditName}
                      onSaveName={() => handleSaveName(user.uid)}
                      onRoleChange={(role) => handleRoleChange(user.uid, role)}
                      onToggleActive={() => handleToggleActive(user)}
                    />
                  ))}
                </div>

                {/* Inactive Users */}
                {inactiveUsers.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Usuarios Inactivos</p>
                    <div className="space-y-2 opacity-60">
                      {inactiveUsers.map(user => (
                        <UserRow
                          key={user.uid}
                          user={user}
                          isCurrentUser={false}
                          isEditing={editingUser === user.uid}
                          editName={editName}
                          isUpdating={updatingId === user.uid}
                          onEditStart={() => { setEditingUser(user.uid); setEditName(user.name); }}
                          onEditCancel={() => setEditingUser(null)}
                          onEditNameChange={setEditName}
                          onSaveName={() => handleSaveName(user.uid)}
                          onRoleChange={(role) => handleRoleChange(user.uid, role)}
                          onToggleActive={() => handleToggleActive(user)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {users.length === 0 && (
                  <p className="text-center py-8 text-gray-500">Sin usuarios registrados</p>
                )}
              </>
            )}

            {/* Permissions Legend */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Permisos por Rol</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ROLE_OPTIONS.map(role => (
                  <div key={role.value} className={`p-3 rounded-xl border ${role.bgColor}`}>
                    <p className={`text-sm font-bold ${role.color} mb-1`}>{role.label}</p>
                    <p className="text-xs text-gray-600">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RoleGuard>

        {/* Alert Configuration — Admin only */}
        <RoleGuard requires="canManageUsers">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Bell size={20} />
              Alertas y Notificaciones
            </h2>
            <AlertSettings />
          </div>
        </RoleGuard>

        {/* Email Sequence Configuration — Admin only */}
        <RoleGuard requires="canManageUsers">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Mail size={20} />
              Emails Automáticos de Onboarding
            </h2>
            <EmailSequenceSettings />
          </div>
        </RoleGuard>

        {/* Current User Profile */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-6 animate-fade-in-up">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield size={20} />
            Tu Perfil
          </h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
              {appUser?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{appUser?.name}</p>
              <p className="text-sm text-gray-500">{appUser?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rol</p>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${getRoleConfig(appUser?.role || 'read_only').bgColor} ${getRoleConfig(appUser?.role || 'read_only').color}`}>
                {getRoleConfig(appUser?.role || 'read_only').label}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estado</p>
              <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Activo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(user) => {
            addToast({ message: `Usuario "${user.name}" creado correctamente`, type: 'success' });
            setShowCreateModal(false);
          }}
          onError={(msg) => addToast({ message: msg, type: 'error' })}
        />
      )}
    </>
  );
}

// ─── User Row Component ───────────────────────────────────────────

interface UserRowProps {
  user: AppUser;
  isCurrentUser: boolean;
  isEditing: boolean;
  editName: string;
  isUpdating: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditNameChange: (name: string) => void;
  onSaveName: () => void;
  onRoleChange: (role: UserRole) => void;
  onToggleActive: () => void;
}

function UserRow({
  user, isCurrentUser, isEditing, editName, isUpdating,
  onEditStart, onEditCancel, onEditNameChange, onSaveName,
  onRoleChange, onToggleActive
}: UserRowProps) {
  const roleConfig = getRoleConfig(user.role);

  return (
    <div className={`rounded-xl border p-3 sm:p-4 transition-all ${
      isCurrentUser ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
    }`}>
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Avatar */}
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0 ${
          !user.active ? 'bg-gray-400' :
          user.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-red-700' :
          user.role === 'comercial' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
          'bg-gradient-to-br from-gray-400 to-gray-600'
        }`}>
          {user.name.charAt(0).toUpperCase()}
        </div>

        {/* Name + Email */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSaveName(); if (e.key === 'Escape') onEditCancel(); }}
                className="text-sm font-bold text-gray-900 border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full max-w-[160px] sm:max-w-[200px]"
                autoFocus
              />
              <button onClick={onSaveName} className="text-emerald-600 hover:text-emerald-700 p-1" title="Guardar">
                <Check size={16} />
              </button>
              <button onClick={onEditCancel} className="text-gray-400 hover:text-gray-600 p-1" title="Cancelar">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="font-bold text-sm text-gray-900 truncate">{user.name}</h3>
              {isCurrentUser && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">TÚ</span>
              )}
              <button
                onClick={onEditStart}
                className="text-gray-300 hover:text-gray-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="Editar nombre"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>

        {/* Role Selector + Toggle — stacked on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <select
            value={user.role}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            disabled={isUpdating || isCurrentUser}
            className={`text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-w-[90px] sm:max-w-none ${roleConfig.bgColor} ${roleConfig.color}`}
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <button
            onClick={onToggleActive}
            disabled={isUpdating || isCurrentUser}
            className={`p-1 sm:p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              user.active
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={user.active ? 'Desactivar usuario' : 'Activar usuario'}
          >
            {user.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>

          {isUpdating && <Loader2 size={16} className="animate-spin text-blue-600 flex-shrink-0" />}
        </div>
      </div>
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────────────────

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
  onError: (message: string) => void;
}

function CreateUserModal({ onClose, onSuccess, onError }: CreateUserModalProps) {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'comercial' as UserRole });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nombre obligatorio';
    if (!form.email.trim()) errs.email = 'Email obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email no válido';
    if (!form.password) errs.password = 'Contraseña obligatoria';
    else if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setCreating(true);
    try {
      const user = await UserService.createUser(form.email.trim(), form.password, form.name.trim(), form.role);
      onSuccess(user);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      const code = firebaseErr?.code || '';
      if (code === 'auth/email-already-in-use') {
        onError('Este email ya está registrado');
      } else if (code === 'auth/weak-password') {
        onError('La contraseña es demasiado débil (mínimo 6 caracteres)');
      } else if (code === 'auth/invalid-email') {
        onError('El email no es válido');
      } else {
        onError(`Error al crear usuario: ${firebaseErr?.message || 'desconocido'}`);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain p-5 sm:p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" />
            Nuevo Usuario
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre completo"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@serasan.es"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Rol</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map(role => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: role.value })}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    form.role === role.value
                      ? `${role.bgColor} ${role.color} ring-2 ring-offset-1 ring-current`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <p className="text-xs font-bold">{role.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              El usuario recibirá acceso inmediato con las credenciales proporcionadas. Comunica la contraseña de forma segura.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Crear Usuario
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
