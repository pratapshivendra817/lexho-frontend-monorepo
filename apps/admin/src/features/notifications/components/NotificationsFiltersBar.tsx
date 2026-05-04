type NotificationsFiltersBarProps = {
  search: string;
  userType: string;
  notificationType: string;
  channelType: string;
  status: string;
  onSearchChange: (value: string) => void;
  onUserTypeChange: (value: string) => void;
  onNotificationTypeChange: (value: string) => void;
  onChannelTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onReset: () => void;
};

export function NotificationsFiltersBar({
  search,
  userType,
  notificationType,
  channelType,
  status,
  onSearchChange,
  onUserTypeChange,
  onNotificationTypeChange,
  onChannelTypeChange,
  onStatusChange,
  onReset,
}: NotificationsFiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-2 xl:grid-cols-6">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search notifications"
        className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] xl:col-span-2"
      />

      <select
        value={userType}
        onChange={(event) => onUserTypeChange(event.target.value)}
        className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
      >
        <option value="">All Users</option>
        <option value="ALL_USERS">All Users</option>
        <option value="CUSTOMERS">Customers</option>
        <option value="PROVIDERS">Providers</option>
        <option value="CITY_USERS">City Users</option>
        <option value="PREMIUM_USERS">Premium Users</option>
        <option value="INACTIVE_USERS">Inactive Users</option>
      </select>

      <select
        value={notificationType}
        onChange={(event) => onNotificationTypeChange(event.target.value)}
        className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
      >
        <option value="">All Types</option>
        <option value="BOOKING">Booking</option>
        <option value="PAYMENT">Payment</option>
        <option value="OFFER">Offer</option>
        <option value="REVIEW">Review</option>
        <option value="PROMOTION">Promotion</option>
        <option value="SYSTEM">System</option>
      </select>

      <select
        value={channelType}
        onChange={(event) => onChannelTypeChange(event.target.value)}
        className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
      >
        <option value="">All Channels</option>
        <option value="PUSH">Push</option>
        <option value="EMAIL">Email</option>
        <option value="SMS">SMS</option>
        <option value="IN_APP">In App</option>
      </select>

      <div className="flex gap-2">
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">All Status</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="READ">Read</option>
          <option value="CLICKED">Clicked</option>
        </select>
        <button
          type="button"
          onClick={onReset}
          className="rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-muted)]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
