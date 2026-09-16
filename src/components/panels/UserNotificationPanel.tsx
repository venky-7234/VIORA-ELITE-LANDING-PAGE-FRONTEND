import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCircle2, Search, Filter, Inbox, Clock, Calendar } from 'lucide-react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/api';

interface UserNotificationPanelProps {
  token: string;
}

export const UserNotificationPanel: React.FC<UserNotificationPanelProps> = ({ token }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const loadNotifications = () => {
    fetchNotifications(token)
      .then(data => {
        setNotifications(data.data.content || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch notifications', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('mock-state-updated', loadNotifications);
    return () => window.removeEventListener('mock-state-updated', loadNotifications);
  }, [token]);

  const markAsRead = (id: number) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    markNotificationRead(id, token).catch(() => loadNotifications()); // Revert on failure
  };

  const markAllAsRead = () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    markAllNotificationsRead(token).catch(() => loadNotifications()); // Revert on failure
  };

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => filter === 'ALL' || (filter === 'UNREAD' && !n.isRead))
      .filter(n => 
        (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (n.message && n.message.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [notifications, filter, searchQuery]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif text-[#F5F5F5] tracking-wide">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#C5A059] text-black text-xs font-bold">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-[#888] mt-2">Updates and alerts regarding your applications and exclusive events.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={16} />
            <input 
              type="text" 
              placeholder="Search alerts..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-[#111] border border-[#333] rounded-full text-sm text-[#F5F5F5] placeholder-[#555] focus:outline-none focus:border-[#C5A059] transition-colors w-64"
            />
          </div>

          <div className="flex bg-[#111] border border-[#333] rounded-full p-1">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-colors ${filter === 'ALL' ? 'bg-[#222] text-[#F5F5F5]' : 'text-[#888] hover:text-[#CCC]'}`}
            >
              ALL
            </button>
            <button 
              onClick={() => setFilter('UNREAD')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-colors ${filter === 'UNREAD' ? 'bg-[#C5A059] text-black' : 'text-[#888] hover:text-[#CCC]'}`}
            >
              UNREAD
            </button>
          </div>

          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#222] border border-[#333] hover:border-[#C5A059]/50 rounded-full text-sm text-[#CCC] hover:text-[#C5A059] transition-all"
            >
              <CheckCircle2 size={16} />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto pr-4 space-y-4">
        {isLoading ? (
          // Loading Skeletons
          [1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-[#111] border border-[#222] rounded-2xl animate-pulse" />
          ))
        ) : filteredNotifications.length === 0 ? (
          // Empty State
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-[#111] border border-[#333] flex items-center justify-center">
              <Inbox className="text-[#555]" size={40} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif text-[#F5F5F5] tracking-wide">All Caught Up</h2>
              <p className="text-[#888] max-w-sm mx-auto">
                {searchQuery ? 'No notifications match your search query.' : filter === 'UNREAD' ? 'You have no unread notifications at the moment.' : 'You do not have any notifications yet.'}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notif, idx) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative p-5 rounded-2xl border transition-all duration-300 group ${
                  notif.isRead 
                    ? 'bg-[#111]/30 border-[#222] hover:bg-[#111]' 
                    : 'bg-[#1A1A1A] border-[#C5A059]/30 hover:border-[#C5A059]/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                }`}
              >
                {!notif.isRead && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                )}

                <div className="flex gap-5 relative z-10">
                  {/* Icon */}
                  <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${
                    notif.isRead ? 'bg-[#222] text-[#888]' : 'bg-[#C5A059]/10 text-[#C5A059]'
                  }`}>
                    <Bell size={20} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h4 className={`text-base font-semibold truncate ${notif.isRead ? 'text-[#CCC]' : 'text-[#F5F5F5]'}`}>
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-[#666] shrink-0">
                        <Clock size={12} />
                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-[#666]' : 'text-[#AAA]'}`}>
                      {notif.message}
                    </p>
                  </div>

                  {/* Actions */}
                  {!notif.isRead && (
                    <button 
                      onClick={() => markAsRead(notif.id)}
                      className="shrink-0 w-8 h-8 rounded-full border border-[#333] flex items-center justify-center text-[#888] hover:bg-[#C5A059] hover:text-black hover:border-[#C5A059] transition-all opacity-0 group-hover:opacity-100"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
