// src/components/notifications/NotificationTable.tsx
import type { Notification } from "@/types/notification";
import NotificationRow from "./NotificationRow";

export default function NotificationTable({
  data,
}: {
  data: Notification[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-3">Title</th>
            <th className="p-3">Type</th>
            <th className="p-3">Audience</th>
            <th className="p-3">Status</th>
            <th className="p-3">Date</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <NotificationRow key={item.id} data={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}