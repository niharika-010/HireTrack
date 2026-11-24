// TypeScript interfaces for user notifications and unread badge counts.

export interface NotificationItem {
  notificationId: number;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  totalCount: number;
  unreadCount: number;
}

export interface SingleNotificationResponse {
  message: string;
  notification: NotificationItem;
}

export interface MarkAllReadResponse {
  message: string;
  updatedCount: number;
}
