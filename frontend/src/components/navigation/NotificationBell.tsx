import { useCallback, useEffect, useState } from 'react';
import { useAppConfig } from '../../hooks/useAppConfig';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/notificationService';
import type { NotificationItem } from '../../types/notification';
import { formatDateTime } from '../../utils/applicationHelpers';

/**
 * Top-navbar notification bell icon displaying live unread badge counts
 * and a dropdown list with Mark-as-Read and Mark-All-Read controls.
 */
export function NotificationBell() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load initial notifications and unread count on mount.
  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchNotifications(apiBaseUrl, authToken)
      .then((response) => {
        if (!isCancelled) {
          setNotifications(response.notifications);
          setUnreadCount(response.unreadCount);
          setLoadError(null);
        }
      })
      .catch(() => {
        // Keep header non-disruptive if initial background fetch fails.
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken]);

  const refreshNotifications = useCallback(async () => {
    if (!authToken) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetchNotifications(apiBaseUrl, authToken);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load notifications.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authToken]);

  function handleToggleDropdown() {
    const nextOpenState = !isOpen;
    setIsOpen(nextOpenState);
    if (nextOpenState) {
      void refreshNotifications();
    }
  }

  async function handleMarkSingleRead(notificationId: number) {
    if (!authToken) {
      return;
    }

    try {
      const response = await markNotificationAsRead(
        apiBaseUrl,
        authToken,
        notificationId
      );
      setNotifications((prev) =>
        prev.map((item) =>
          item.notificationId === notificationId ? response.notification : item
        )
      );
      setUnreadCount((prevCount) => Math.max(prevCount - 1, 0));
    } catch {
      setLoadError('Unable to mark notification as read.');
    }
  }

  async function handleMarkAllRead() {
    if (!authToken || unreadCount === 0) {
      return;
    }

    try {
      await markAllNotificationsAsRead(apiBaseUrl, authToken);
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
    } catch {
      setLoadError('Unable to mark all notifications as read.');
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggleDropdown}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Notifications
                </p>
                <p className="text-xs text-slate-500">
                  {unreadCount} unread
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <p className="px-4 py-6 text-center text-xs text-slate-500">
                  Loading notifications...
                </p>
              ) : loadError ? (
                <p className="px-4 py-4 text-xs text-rose-600">{loadError}</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-500">
                  No notifications yet. Activity updates will appear here.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifications.map((item) => (
                    <li
                      key={item.notificationId}
                      className={`px-4 py-3 transition ${
                        item.isRead ? 'bg-white' : 'bg-indigo-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900">
                          {!item.isRead && (
                            <span
                              className="mr-1.5 inline-block h-2 w-2 rounded-full bg-indigo-600"
                              aria-hidden="true"
                            />
                          )}
                          {item.title}
                        </p>
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleMarkSingleRead(item.notificationId)
                            }
                            className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {item.message}
                      </p>
                      <time className="mt-1 block text-[11px] text-slate-400">
                        {formatDateTime(item.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
