import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink, AlertTriangle, AlertOctagon, CheckCircle2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation, AppNotification } from '../../context/SimulationContext';
import { cn } from '../../utils/cn';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markNotificationAsRead, clearAllNotifications } = useSimulation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'DANGER':
        return <AlertOctagon size={14} className="text-rose-600 shrink-0 mt-0.5" />;
      case 'WARNING':
        return <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />;
      case 'SUCCESS':
        return <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />;
      case 'INFO':
      default:
        return <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors',
          isOpen && 'bg-slate-100 text-slate-900'
        )}
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-card shadow-dropdown z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-mono font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No notifications</div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={cn(
                    'p-3.5 flex gap-3 text-xs transition-colors hover:bg-slate-50/80',
                    !notif.read ? 'bg-blue-50/20' : 'opacity-85'
                  )}
                  onClick={() => markNotificationAsRead(notif.id)}
                >
                  {getNotificationIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-slate-900 text-[11px] tracking-tight">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px] mb-2">{notif.message}</p>
                    {notif.link && (
                      <Link
                        to={notif.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800 hover:underline"
                      >
                        <span>{notif.actionText || 'View Details'}</span>
                        <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
