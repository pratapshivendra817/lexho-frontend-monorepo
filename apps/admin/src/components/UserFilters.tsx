// src/components/UserFilters.tsx
//import React from "react";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  search: string;
  setSearch: (val: string) => void;
}

const tabs = ["ALL", "CUSTOMER", "PROVIDER", "BLOCKED"];

export default function UserFilters({
  activeTab,
  setActiveTab,
  search,
  setSearch,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm ${
              activeTab === tab
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none"
        />
        <button className="bg-purple-600 px-4 py-2 rounded-lg text-white">
          + Add User
        </button>
      </div>
    </div>
  );
}