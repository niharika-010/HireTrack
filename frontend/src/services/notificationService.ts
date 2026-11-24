import type {
  MarkAllReadResponse,
  NotificationListResponse,
  SingleNotificationResponse,
} from '../types/notification';
import { buildApiEndpointUrl } from '../utils/formatters';

/**
 * Fetches all notifications and the live unread count for the logged-in user (GET /api/notifications).
 */
export async function fetchNotifications(
  apiBaseUrl: string,
  authToken: string,
  unreadOnly = false
): Promise<NotificationListResponse> {
  const baseEndpoint = buildApiEndpointUrl(apiBaseUrl, '/notifications');
  const fullUrl = unreadOnly ? `${baseEndpoint}?unreadOnly=true` : baseEndpoint;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load notifications (HTTP ${response.status})`);
  }

  return (await response.json()) as NotificationListResponse;
}

/**
 * Marks one notification as read via PATCH /api/notifications/:id/read.
 */
export async function markNotificationAsRead(
  apiBaseUrl: string,
  authToken: string,
  notificationId: number
): Promise<SingleNotificationResponse> {
  const endpointUrl = buildApiEndpointUrl(
    apiBaseUrl,
    `/notifications/${notificationId}/read`
  );

  const response = await fetch(endpointUrl, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to mark notification as read (HTTP ${response.status})`
    );
  }

  return (await response.json()) as SingleNotificationResponse;
}

/**
 * Marks every unread notification for the logged-in user as read via PATCH /api/notifications/read-all.
 */
export async function markAllNotificationsAsRead(
  apiBaseUrl: string,
  authToken: string
): Promise<MarkAllReadResponse> {
  const endpointUrl = buildApiEndpointUrl(
    apiBaseUrl,
    '/notifications/read-all'
  );

  const response = await fetch(endpointUrl, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to mark all notifications as read (HTTP ${response.status})`
    );
  }

  return (await response.json()) as MarkAllReadResponse;
}
