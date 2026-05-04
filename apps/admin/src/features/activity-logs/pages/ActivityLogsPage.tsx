import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { fetchActivityLogs } from "@/api/admin";
import { ActivityFilters, ActivityTable, ActivityTimeline } from "../components";

export default function ActivityLogsPage() {
  const [view, setView] = useState<"table" | "timeline">("table");
  const [role, setRole] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: fetchActivityLogs,
    retry: false,
  });

  const logs = data ?? [];

  const filtered = logs.filter((log) => (role ? log.role === role : true));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Activity Logs</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1 rounded ${
              view === "table"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Table
          </button>

          <button
            onClick={() => setView("timeline")}
            className={`px-3 py-1 rounded ${
              view === "timeline" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      <ActivityFilters role={role} setRole={setRole} />

      {isLoading ? (
        <div className="text-gray-300">Loading activity logs...</div>
      ) : isError ? (
        <div className="space-y-3">
          <div className="text-red-300">Failed to load activity logs.</div>
          <button type="button" onClick={() => void refetch()} className="px-3 py-1 bg-red-600 rounded">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400">No activity logs found</div>
      ) : view === "table" ? (
        <ActivityTable data={filtered} />
      ) : (
        <ActivityTimeline data={filtered} />
      )}
    </div>
  );
}

