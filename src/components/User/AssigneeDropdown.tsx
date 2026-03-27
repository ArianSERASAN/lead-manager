import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppUser } from '../../types/domain';
import { ChevronDown, Loader2 } from 'lucide-react';

interface AssigneeDropdownProps {
  currentAssigneeId?: string;
  onAssign: (userId: string) => void;
  disabled?: boolean;
}

export function AssigneeDropdown({ currentAssigneeId, onAssign, disabled = false }: AssigneeDropdownProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), where('active', '==', true));
        const snapshot = await getDocs(q);
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

  const currentUser = users.find(u => u.uid === currentAssigneeId);

  const handleSelect = (userId: string) => {
    onAssign(userId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Asignar lead a usuario"
        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-left focus:ring-2 focus:ring-blue-500 outline-none hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className="truncate">
          {loading ? 'Cargando...' : (currentUser ? `${currentUser.name} (${currentUser.email})` : 'Sin asignar')}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !loading && (
        <div role="listbox" aria-label="Lista de usuarios" className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {/* Sin asignar option */}
          <button
            onClick={() => handleSelect('')}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!currentAssigneeId ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}`}
          >
            Sin asignar
          </button>

          {/* User options */}
          <div className="border-t border-gray-200">
            {users.map(user => (
              <button
                key={user.uid}
                onClick={() => handleSelect(user.uid)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                  currentAssigneeId === user.uid ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                }`}
              >
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {user.role === 'admin' && '👑 Administrador'}
                  {user.role === 'comercial' && '📊 Comercial'}
                  {user.role === 'read_only' && '👁️ Lectura'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
