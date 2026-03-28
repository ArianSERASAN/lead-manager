import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppUser } from '../../types/domain';

interface AssigneeFilterProps {
  selectedAssignees: string[];
  onAssigneeChange: (assignees: string[]) => void;
  currentUserId?: string;
}

export function AssigneeFilter({ selectedAssignees, onAssigneeChange, currentUserId }: AssigneeFilterProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const userData: AppUser[] = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as AppUser[];
        setUsers(userData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error loading users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const toggleAssignee = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      onAssigneeChange(selectedAssignees.filter(id => id !== userId));
    } else {
      onAssigneeChange([...selectedAssignees, userId]);
    }
  };

  const handleAssignedToMe = () => {
    if (currentUserId) {
      if (selectedAssignees.includes(currentUserId)) {
        onAssigneeChange(selectedAssignees.filter(id => id !== currentUserId));
      } else {
        onAssigneeChange([...selectedAssignees, currentUserId]);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">Asignado a</label>
        {selectedAssignees.length > 0 && (
          <button
            onClick={() => onAssigneeChange([])}
            className="text-xs text-gray-500 hover:text-red-500 font-medium"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* Quick button for "Assigned to Me" */}
        {currentUserId && (
          <button
            onClick={handleAssignedToMe}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors border-2 ${
              selectedAssignees.includes(currentUserId)
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✓ Asignados a mí
          </button>
        )}

        {/* Unassigned option */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={selectedAssignees.includes('unassigned')}
            onChange={() => {
              if (selectedAssignees.includes('unassigned')) {
                onAssigneeChange(selectedAssignees.filter(id => id !== 'unassigned'));
              } else {
                onAssigneeChange([...selectedAssignees, 'unassigned']);
              }
            }}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700">Sin asignar</span>
        </label>

        {/* Users list */}
        {loading ? (
          <p className="text-xs text-gray-500">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-gray-500">Sin usuarios disponibles</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {users.map(user => (
              <label
                key={user.uid}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedAssignees.includes(user.uid)}
                  onChange={() => toggleAssignee(user.uid)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{user.name}</span>
                <span className="text-xs text-gray-500">({user.role})</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
