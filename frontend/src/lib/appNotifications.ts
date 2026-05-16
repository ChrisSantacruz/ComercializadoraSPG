export type NotificationAction = {
  label: string;
  onClick: () => void;
};

export type AppNotificationSink = {
  showSuccess: (title: string, message: string, action?: NotificationAction) => void;
  showError: (title: string, message: string) => void;
};

let sink: AppNotificationSink | null = null;

export function registerAppNotificationSink(next: AppNotificationSink | null): void {
  sink = next;
}

export function notifyCartSuccess(
  title: string,
  message: string,
  action?: NotificationAction,
): void {
  sink?.showSuccess(title, message, action);
}

export function notifyCartError(title: string, message: string): void {
  sink?.showError(title, message);
}
