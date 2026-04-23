import type { Banner } from "../types/banner";
import { Pencil, Trash } from "lucide-react";

const tagColors = {
  PROMO: "bg-green-500",
  OFFER: "bg-orange-500",
  ENGAGE: "bg-yellow-500",
};

const gradientMap = {
  PROMO: "from-green-600 to-green-800",
  OFFER: "from-orange-600 to-orange-800",
  ENGAGE: "from-yellow-600 to-yellow-800",
};

export default function BannerCard({ banner }: { banner: Banner }) {
  return (
    <div
      className={`rounded-2xl p-4 bg-gradient-to-br ${gradientMap[banner.tag]} shadow-lg border border-white/10 hover:scale-[1.02] transition`}
    >
      {/* Title */}
      <h2 className="text-lg font-semibold mb-2">{banner.title}</h2>

      {/* Tag */}
      <span
        className={`text-xs px-2 py-1 rounded-full ${tagColors[banner.tag]}`}
      >
        {banner.tag}
      </span>

      {/* Bottom Section */}
      <div className="mt-4 p-3 bg-black/30 rounded-xl">
        <p className="text-sm text-gray-300">
          {banner.status} • Slot {banner.slot}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button className="flex items-center gap-1 px-3 py-1 border border-green-400 text-green-400 rounded-lg hover:bg-green-500/10">
            <Pencil size={14} /> Edit
          </button>

          <button className="flex items-center gap-1 px-3 py-1 border border-red-400 text-red-400 rounded-lg hover:bg-red-500/10">
            <Trash size={14} /> Del
          </button>
        </div>
      </div>
    </div>
  );
}