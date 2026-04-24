interface Props {
  search: string;
  setSearch: (val: string) => void;
  activeTab: string;
  setActiveTab: (val: string) => void;
}

const tabs = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export default function BookingFilters({
  search,
  setSearch,
  activeTab,
  setActiveTab,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
        className="bg-slate-800 px-4 py-2 rounded-lg outline-none"
      />

      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-full border text-sm ${
              activeTab === tab
                ? "bg-blue-600 border-blue-600"
                : "border-gray-600 hover:bg-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}