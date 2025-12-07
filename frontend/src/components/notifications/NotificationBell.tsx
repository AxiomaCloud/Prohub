'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  FileText,
  DollarSign,
  Building2,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  channel: string;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  DOCUMENT_UPLOADED: <FileText className="w-4 h-4" />,
  DOCUMENT_PARSED: <FileText className="w-4 h-4" />,
  DOCUMENT_STATUS_CHANGED: <FileText className="w-4 h-4" />,
  PAYMENT_ISSUED: <DollarSign className="w-4 h-4" />,
  PAYMENT_SCHEDULED: <DollarSign className="w-4 h-4" />,
  PAYMENT_COMPLETED: <DollarSign className="w-4 h-4" />,
  SUPPLIER_INVITED: <Building2 className="w-4 h-4" />,
  SUPPLIER_APPROVED: <Building2 className="w-4 h-4" />,
  SUPPLIER_REJECTED: <Building2 className="w-4 h-4" />,
  REQ_SUBMITTED: <ShoppingCart className="w-4 h-4" />,
  REQ_APPROVED: <ShoppingCart className="w-4 h-4" />,
  REQ_REJECTED: <ShoppingCart className="w-4 h-4" />,
  REQ_NEEDS_APPROVAL: <ShoppingCart className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  DOCUMENT_UPLOADED: 'bg-blue-100 text-blue-600',
  DOCUMENT_PARSED: 'bg-green-100 text-green-600',
  DOCUMENT_STATUS_CHANGED: 'bg-purple-100 text-purple-600',
  PAYMENT_ISSUED: 'bg-emerald-100 text-emerald-600',
  PAYMENT_SCHEDULED: 'bg-amber-100 text-amber-600',
  PAYMENT_COMPLETED: 'bg-green-100 text-green-600',
  SUPPLIER_INVITED: 'bg-indigo-100 text-indigo-600',
  SUPPLIER_APPROVED: 'bg-green-100 text-green-600',
  SUPPLIER_REJECTED: 'bg-red-100 text-red-600',
  REQ_SUBMITTED: 'bg-blue-100 text-blue-600',
  REQ_APPROVED: 'bg-green-100 text-green-600',
  REQ_REJECTED: 'bg-red-100 text-red-600',
  REQ_NEEDS_APPROVAL: 'bg-yellow-100 text-yellow-600',
};

export function NotificationBell() {
  const router = useRouter();
  const { tenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [tenant?.id]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('hub_token');
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications?limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-Id': tenant?.id || '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('hub_token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}/read`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('hub_token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read-all`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readAt) {
      markAsRead(notification.id);
    }

    // Navigate based on notification data
    if (notification.data?.actionUrl) {
      router.push(notification.data.actionUrl);
    }

    setIsOpen(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return format(date, 'd MMM', { locale: es });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                    !notification.readAt ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      typeColors[notification.type] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {typeIcons[notification.type] || <Bell className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        !notification.readAt ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.readAt && (
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  router.push('/configuracion/notificaciones');
                  setIsOpen(false);
                }}
                className="text-sm text-primary hover:text-primary-dark w-full text-center"
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
