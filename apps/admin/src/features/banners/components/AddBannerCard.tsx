import { Plus } from "lucide-react";

export default function AddBannerCard() {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-purple-500 rounded-2xl h-full text-gray-400 hover:bg-purple-500/10 transition cursor-pointer">
      <Plus size={32} />
      <p className="mt-2">Add New Banner</p>
    </div>
  );
}