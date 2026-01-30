import { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, X } from 'lucide-react';
import api from '../utils/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications", error);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      
      // Update local state
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        await api.delete(`/notifications/${id}`);
        setNotifications(prev => prev.filter(n => n.id !== id));
        // Recalculate unread just in case
        const notif = notifications.find(n => n.id === id);
        if (notif && !notif.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    } catch (error) {
        console.error("Error deleting notification", error);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-50 border border-gray-200 dark:border-gray-700">
          <div className="py-2 px-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-white">Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">Aucune notification</div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className={`border-b border-gray-100 dark:border-gray-700 last:border-0 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex justify-between items-start mb-1">
                        <span className={`font-medium text-sm ${!notification.read ? 'text-blue-800 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                            {notification.title}
                        </span>
                        <div className="flex items-center gap-1">
                            {!notification.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                            <button 
                                onClick={(e) => deleteNotification(notification.id, e)}
                                className="text-gray-400 hover:text-red-500 p-1"
                                title="Supprimer"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">{notification.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
