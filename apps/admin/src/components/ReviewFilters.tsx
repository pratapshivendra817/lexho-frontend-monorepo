// src/components/ReviewFilters.tsx
interface Props {
  rating: number | null;
  service: string;
  onRatingChange: (value: number | null) => void;
  onServiceChange: (value: string) => void;
}

export default function ReviewFilters({
  rating,
  service,
  onRatingChange,
  onServiceChange,
}: Props) {
  return (
    <div className="flex gap-4 mb-4">
      {/* Rating Filter */}
      <select
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded"
        value={rating ?? ""}
        onChange={(e) =>
          onRatingChange(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">All Ratings</option>
        {[1, 2, 3, 4, 5].map((r) => (
          <option key={r} value={r}>
            {r} Stars
          </option>
        ))}
      </select>

      {/* Service Filter */}
      <input
        type="text"
        placeholder="Filter by service"
        value={service}
        onChange={(e) => onServiceChange(e.target.value)}
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded"
      />
    </div>
  );
}