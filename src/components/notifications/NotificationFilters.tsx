// NotificationFilters.tsx
interface Props {
  search: string;
  setSearch: (v: string) => void;
  type: string;
  setType: (v: string) => void;
}

export default function NotificationFilters({
  search,
  setSearch,
  type,
  setType,
}: Props) {
  return (
    <div className="flex gap-3 flex-wrap">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search notifications..."
        className="px-3 py-2 bg-[#020617] border border-gray-700 rounded-lg text-sm"
      />

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="px-3 py-2 bg-[#020617] border border-gray-700 rounded-lg text-sm"
      >
        <option value="">All Types</option>
        <option value="SMS">SMS</option>
        <option value="EMAIL">Email</option>
        <option value="PUSH">Push</option>
      </select>
    </div>
  );
}