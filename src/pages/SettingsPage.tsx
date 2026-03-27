import { Settings, Users, Package, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Header } from '../components/Layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/leads/useLeads';
import { db } from '../lib/firebase';
import { AppUser, UserRole } from '../types/domain';
import { RoleGuard } from '../components/User/RoleGuard';
import { Loader2 } from 'lucide-react';

export function SettingsPage() {
  const { appUser } = useAuth();
  const { leads } = useLeads();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const usersData = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as AppUser));
        setUsers(usersData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating role:', err);
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'comercial': return 'bg-blue-100 text-blue-700';
      case 'read_only': return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'comercial': return 'Comercial';
      case 'read_only': return 'Solo Lectura';
    }
  };

  return (
    <>
      <Header title="Configuración" user={appUser} />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* App Info Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Package size={20} />
            Información de la Aplicación
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Versión</p>
                <p className="text-lg font-bold text-gray-900">1.0.0</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total de Leads</p>
                <p className="text-lg font-bold text-gray-900">{leads.length}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total de Usuarios</p>
                <p className="text-lg font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Management Section - Only visible to admins */}
        <RoleGuard requires="canManageUsers">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users size={20} />
              Gestión de Usuarios
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div
                    key={user.uid}
                    className="bg-gray-50 rounded-lg p-4 flex items-start justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {!user.active && (
                        <span className="text-xs text-red-600 font-semibold mt-1">Inactivo</span>
                      )}
                    </div>

                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      disabled={updating === user.uid}
                      className={`${getRoleColor(user.role)} text-xs font-bold px-3 py-2 rounded-lg border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="admin">Administrador</option>
                      <option value="comercial">Comercial</option>
                      <option value="read_only">Solo Lectura</option>
                    </select>
                  </div>
                ))}

                {users.length === 0 && (
                  <p className="text-center py-8 text-gray-500">Sin usuarios</p>
                )}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Nota:</strong> Para invitar nuevos usuarios, debes crear primero una cuenta en Firebase Auth y luego añadirla a la colección 'users' en Firestore.
              </p>
            </div>
          </div>
        </RoleGuard>

        {/* Current User Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield size={20} />
            Tu Perfil
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Nombre</p>
              <p className="text-sm font-semibold text-gray-900">{appUser?.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
              <p className="text-sm font-semibold text-gray-900">{appUser?.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Rol</p>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getRoleColor(appUser?.role || 'read_only')}`}>
                {getRoleLabel(appUser?.role || 'read_only')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
