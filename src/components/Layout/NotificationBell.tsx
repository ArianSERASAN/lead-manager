import { useState, useEffect, useRef } from 'react';
import { Bell, UserPlus, Flame, Clock, UserCheck, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppNotification, NotificationType } from '../../types/domain';
import { subscribeToNotifications, markAsRead, markAllRead } from '../../services/NotificationService';
import { formatRelativeTime } from '../../utils/format';

interface NotificationBellProps {
  userId?: string;
}

const typeIcons: Record<NotificationType, typeof Bell> = {
  new_lead: UserPlus,
  hot_lead: Flame,
  stale_lead: Clock,
  assigned: UserCheck,
};

const typeColors: Record<NotificationType, string> = {
  new_lead: 'text-primary-500',
  hot_lead: 'text-orange-500',
  stale_lead: 'text-amber-500',
  assigned: 'text-emerald-500',
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToNotifications(userId, setNotifications);
    return unsub;
  }, [userId]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = async (notif: AppNotification) => {
    if (!notif.read) await markAsRead(notif.id);
    if (notif.leadId) navigate('/');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-indigo-300 hover:bg-white/10 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead(notifications)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold"
              >
                <CheckCheck size={14} />
                Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell size={24} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = typeIcons[notif.type] || Bell;
                const color = typeColors[notif.type] || 'text-gray-400';
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                      !notif.read ? 'bg-primary-50/30' : ''
                    }`}
                  >
                    <Icon size={16} className={`${color} mt-0.5 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'} truncate`}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{notif.body}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">{formatRelativeTime(notif.createdAt)}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-1.5 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
