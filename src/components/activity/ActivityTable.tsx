// components/activity/ActivityTable.tsx
import type { ActivityLog } from "../../types/activity";
import ActivityBadge from "./ActivityBadge";

export default function ActivityTable({ data }: { data: ActivityLog[] }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Admin</th>
            <th className="p-3">Action</th>
            <th className="p-3">Module</th>
            <th className="p-3">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {data.map((log) => (
            <tr key={log.id} className="border-t">
              <td className="p-3">{log.adminName}</td>
              <td className="p-3">{log.action}</td>
              <td className="p-3">
                <ActivityBadge module={log.module} />
              </td>
              <td className="p-3">{log.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}