'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, X, Banknote, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { settlementsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'settlement_completed' | 'dispute_raised' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dupdub-notifications';

/** Map backend settlement statuses to in-app notification entries. */
function settlementsToNotifications(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settlements: any[],
): AppNotification[] {
  return settlements
    .filter((s) => s.status === 'completed' || s.status === 'failed')
    .map((s) => ({
      id: `settlement-${s.id}`,
      type: s.status === 'completed' ? 'settlement_completed' : ('info' as NotificationType),
      title: s.status === 'completed' ? 'Settlement Completed' : 'Settlement Failed',
      message:
        s.status === 'completed'
          ? `Your settlement of $${s.netAmountUsd?.toFixed(2) ?? '—'} has been processed.`
          : `Settlement $${s.netAmountUsd?.toFixed(2) ?? '—'} failed${s.failureReason ? `: ${s.failureReason}` : '.'}`,
      createdAt: s.updatedAt ?? s.createdAt,
      read: false,
    }));
}

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // storage unavailable — silently ignore
  }
}

// ── Icon map ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<NotificationType, typeof Banknote> = {
  settlement_completed: Banknote,
  dispute_raised: AlertTriangle,
  info: Info,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  settlement_completed: 'text-green-600 bg-green-50',
  dispute_raised: 'text-red-600 bg-red-50',
  info: 'text-blue-600 bg-blue-50',
};

// ── Component ────────────────────────────────────────────────────────────────

/**
 * NotificationCenter — bell icon in the top bar that opens a dropdown panel
 * showing settlement-completed and dispute events fetched from the API.
 *
 * Accessibility:
 * - Bell button has aria-label and aria-expanded
 * - Panel has role="region" and aria-label
 * - Unread badge has aria-label describing the count
 * - Focus is trapped inside the open panel; Escape closes it
 * - Each notification is a list item with readable time
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const panelRef = useFocusTrap<HTMLDivElement>(open);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Load read IDs from localStorage once on mount
  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  // Fetch notifications whenever the panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErrorMsg('');
    settlementsApi
      .list(1, 50)
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (res.data as any)?.settlements ?? [];
        const mapped = settlementsToNotifications(items).map((n) => ({
          ...n,
          read: readIds.has(n.id),
        }));
        setNotifications(mapped);
      })
      .catch((err) => setErrorMsg(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // readIds intentionally excluded — we only load it once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const newIds = new Set(readIds);
    notifications.forEach((n) => newIds.add(n.id));
    setReadIds(newIds);
    saveReadIds(newIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    const newIds = new Set(readIds);
    newIds.add(id);
    setReadIds(newIds);
    saveReadIds(newIds);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notifications — ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-haspopup="true"
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
            className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop — closes panel on outside click */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            role="region"
            aria-label="Notifications"
            tabIndex={-1}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 outline-none flex flex-col max-h-[32rem]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Notifications
              </h2>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                    aria-label="Mark all notifications as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    bellRef.current?.focus();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div
                  role="status"
                  aria-label="Loading notifications"
                  className="flex items-center justify-center py-10"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
                </div>
              ) : errorMsg ? (
                <div role="alert" className="px-4 py-8 text-center text-red-500 text-sm">
                  {errorMsg}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-400 text-sm">
                  No notifications yet
                </div>
              ) : (
                <ul role="list" aria-label="Notification list">
                  {notifications.map((n) => {
                    const Icon = TYPE_ICONS[n.type];
                    const iconColor = TYPE_COLORS[n.type];
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          'px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0',
                          !n.read && 'bg-brand-50/50 dark:bg-brand-950/30',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                              iconColor,
                            )}
                            aria-hidden="true"
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {n.title}
                              {!n.read && (
                                <span
                                  className="ml-2 inline-block w-2 h-2 rounded-full bg-brand-500 align-middle"
                                  aria-label="Unread"
                                />
                              )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                              {n.message}
                            </p>
                            <time
                              dateTime={n.createdAt}
                              className="text-xs text-gray-400 dark:text-gray-500 mt-1 block"
                            >
                              {new Date(n.createdAt).toLocaleString()}
                            </time>
                          </div>
                          {!n.read && (
                            <button
                              type="button"
                              onClick={() => markRead(n.id)}
                              className="shrink-0 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                              aria-label={`Mark "${n.title}" as read`}
                            >
                              <CheckCheck className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
