type ProviderNotificationBellProps = {
  unreadCount: number;
};

export function NotificationBell({ unreadCount }: ProviderNotificationBellProps) {
  return (
    <div className="partner-notify-bell">
      <span>Alerts</span>
      {unreadCount > 0 ? <span className="partner-notify-badge">{unreadCount}</span> : null}
    </div>
  );
}
