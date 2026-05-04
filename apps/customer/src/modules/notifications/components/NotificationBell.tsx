import { useMemo, useState } from "react";

import type { CustomerNotification } from "../types";

type NotificationBellProps = {
  unreadCount: number;
  items: CustomerNotification[];
  onOpenItem: (notification: CustomerNotification) => void;
};

export function NotificationBell({ unreadCount, items, onOpenItem }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const latestItems = useMemo(() => items.slice(0, 5), [items]);

  return (
    <div className="notify-bell-wrap">
      <button type="button" className="notify-bell-btn" onClick={() => setOpen((prev) => !prev)}>
        <span>Bell</span>
        {unreadCount > 0 ? <span className="notify-badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notify-dropdown">
          {latestItems.length === 0 ? (
            <p className="item-subtitle">No notifications</p>
          ) : (
            latestItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`notify-item-btn ${item.read ? "" : "unread"}`}
                onClick={() => {
                  setOpen(false);
                  onOpenItem(item);
                }}
              >
                <p className="item-title">{item.title}</p>
                <p className="item-subtitle">{item.message}</p>
                <p className="item-subtitle">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</p>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
