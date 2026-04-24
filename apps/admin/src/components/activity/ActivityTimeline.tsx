// components/activity/ActivityTimeline.tsx
import type { ActivityLog } from "../../types/activity";

export default function ActivityTimeline({ data }: { data: ActivityLog[] }) {
  return (
    <div className="space-y-4">
      {data.map((log) => (
        <div key={log.id} className="flex gap-4">
          <div className="w-2 bg-purple-500 rounded-full"></div>

          <div className="bg-white shadow rounded-xl p-4 w-full">
            <p className="text-sm font-semibold">{log.adminName}</p>
            <p className="text-sm text-gray-600">{log.action}</p>

            <div className="flex justify-between text-xs mt-2 text-gray-400">
              <span>{log.module}</span>
              <span>{log.timestamp}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}