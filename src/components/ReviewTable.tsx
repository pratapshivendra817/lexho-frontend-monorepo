// src/components/ReviewTable.tsx
import type { Review } from "../types/review";
import RatingStars from "./RatingStars";

interface Props {
  data: Review[];
  onDelete: (id: string) => void;
  onFlag: (id: string) => void;
}

export default function ReviewTable({ data, onDelete, onFlag }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-left">
          <tr>
            <th className="p-3">User</th>
            <th className="p-3">Provider</th>
            <th className="p-3">Service</th>
            <th className="p-3">Rating</th>
            <th className="p-3">Comment</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((review) => (
            <tr key={review.id} className="border-b border-gray-700">
              <td className="p-3">{review.user}</td>
              <td className="p-3">{review.provider}</td>
              <td className="p-3">{review.service}</td>
              <td className="p-3">
                <RatingStars rating={review.rating} />
              </td>
              <td className="p-3 text-gray-300">{review.comment}</td>

              <td className="p-3 flex gap-2">
                <button
                  onClick={() => onFlag(review.id)}
                  className="px-2 py-1 text-xs bg-yellow-600 rounded"
                >
                  Flag
                </button>

                <button
                  onClick={() => onDelete(review.id)}
                  className="px-2 py-1 text-xs bg-red-600 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}