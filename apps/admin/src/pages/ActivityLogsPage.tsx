// pages/ActivityLogsPage.tsx
import { useState } from "react";
import { activityData } from "../data/activityData";

import ActivityTable from "../components/activity/ActivityTable";
import ActivityTimeline from "../components/activity/ActivityTimeline";
import ActivityFilters from "../components/activity/ActivityFilters";

export default function ActivityLogsPage() {
  const [view, setView] = useState<"table" | "timeline">("table");
  const [role, setRole] = useState("");

  const filtered = activityData.filter((log) =>
    role ? log.role === role : true
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Activity Logs</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1 rounded ${
              //view === "table" ? "bg-purple-600 text-yellow" : "bg-gray-200"
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
              view === "timeline" ? "bg-purple-600 text-yellow" : "bg-gray-200"
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      <ActivityFilters role={role} setRole={setRole} />

      {view === "table" ? (
        <ActivityTable data={filtered} />
      ) : (
        <ActivityTimeline data={filtered} />
      )}
    </div>
  );
}