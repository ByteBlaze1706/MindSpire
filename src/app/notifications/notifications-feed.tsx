// src/app/[tenant]/notifications/notifications-feed.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { NotificationLog } from '../../lib/repositories/notification.repository';
import { markNotificationRead, markAllNotificationsRead } from '../../lib/actions/notification.actions';

interface NotificationsFeedProps {
  notifications: NotificationLog[];
  tenantSubdomain: string;
  hasError: boolean;
}

export function NotificationsFeed({
  notifications: initialList,
  tenantSubdomain,
  hasError,
}: NotificationsFeedProps) {
  const [list, setList] = useState(initialList);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [isPending, startTransition] = useTransition();

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      const res = await markNotificationRead(tenantSubdomain, id);
      if (res.success) {
        setList((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    });
  };

  const handleMarkAllRead = () => {
    if (isPending) return;

    startTransition(async () => {
      const res = await markAllNotificationsRead(tenantSubdomain);
      if (res.success) {
        setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    });
  };

  const filteredList = filter === 'unread' ? list.filter((n) => !n.is_read) : list;

  const getTypeIcon = (type: NotificationLog['type']) => {
    switch (type) {
      case 'community_reply':
        return '💬';
      case 'risk_alert':
        return '⚠️';
      case 'appointment':
        return '📅';
      default:
        return '⚙️';
    }
  };

  if (hasError) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-neutral-100">
        <span className="text-2xl">⚠️</span>
        <h3 className="text-base font-semibold text-neutral-800 mt-2">Error loading inbox</h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Please reload the page to check your notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtering Toolbar */}
      <div className="flex justify-between items-center gap-3 bg-white/50 p-4 rounded-3xl border border-neutral-100/70 flex-wrap">
        <div className="flex bg-neutral-100/70 p-1.5 rounded-2xl">
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
              filter === 'unread' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
            }`}
          >
            Unread Only ({list.filter((n) => !n.is_read).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
              filter === 'all' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
            }`}
          >
            All Notifications
          </button>
        </div>

        {list.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-xs font-bold text-neutral-600 hover:text-neutral-800 transition"
          >
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-neutral-100 space-y-2">
            <span className="text-3xl">🎉</span>
            <h3 className="text-sm font-semibold text-neutral-800">You are all caught up!</h3>
            <p className="text-xs text-neutral-400">No unread notifications waiting for your attention.</p>
          </div>
        ) : (
          filteredList.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && handleMarkRead(notif.id)}
              className={`p-5 rounded-3xl border transition duration-150 flex items-start gap-4 cursor-pointer ${
                notif.is_read
                  ? 'bg-white/60 border-neutral-100 text-neutral-500'
                  : 'bg-white border-neutral-200/80 text-neutral-800 hover:border-neutral-300 shadow-sm'
              }`}
            >
              <div className="text-xl p-2 bg-neutral-50 rounded-2xl border border-neutral-100">
                {getTypeIcon(notif.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start flex-wrap gap-1">
                  <h4 className="text-sm font-bold tracking-tight">{notif.title}</h4>
                  <span className="text-[9px] text-neutral-400">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">{notif.body}</p>
              </div>
              {!notif.is_read && (
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full self-center" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
