// components/activity/ActivityFilters.tsx
interface Props {
  role: string;
  setRole: (val: string) => void;
}

export default function ActivityFilters({ role, setRole }: Props) {
  return (
    <div className="flex gap-4 mb-4">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="border px-3 py-2 rounded-lg text-sm"
      >
        <option value="">All Roles</option>
        <option value="Super Admin">Super Admin</option>
        <option value="Support">Support</option>
        <option value="Finance">Finance</option>
      </select>

      <input
        type="date"
        className="border px-3 py-2 rounded-lg text-sm"
      />

      <input
        type="date"
        className="border px-3 py-2 rounded-lg text-sm"
      />
    </div>
  );
}