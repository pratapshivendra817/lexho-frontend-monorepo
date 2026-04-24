// NotificationsPage.tsx
import { useState } from "react";
import NotificationTable from "../components/notifications/NotificationTable";
import NotificationFilters from "../components/notifications/NotificationFilters";
import CreateNotificationModal from "../components/notifications/CreateNotificationModal";
import { notificationsData } from "../data/notifications";

export default function NotificationsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = notificationsData.filter((n) => {
    return (
      n.title.toLowerCase().includes(search.toLowerCase()) &&
      (type ? n.type === type : true)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Notification Center
        </h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-purple-600 px-4 py-2 rounded-lg text-sm"
        >
          + Create
        </button>
      </div>

      {/* Filters */}
      <NotificationFilters
        search={search}
        setSearch={setSearch}
        type={type}
        setType={setType}
      />

      {/* Table */}
      <NotificationTable data={filtered} />

      {/* Modal */}
      <CreateNotificationModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}