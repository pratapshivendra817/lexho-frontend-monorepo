// components/user/ActivityLogs.tsx
// components/user/ActivityLogs.tsx
import type { Activity } from "../../types/user";

export default function ActivityLogs({ logs }: { logs: Activity[] }) {
  return (
    <div className="bg-[#020617] p-5 rounded-xl">
      <h2 className="mb-4 font-semibold">Activity Logs</h2>

      <ul className="space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="text-sm border-b border-gray-700 pb-2">
            {log.action}
            <span className="block text-gray-400 text-xs">{log.date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}