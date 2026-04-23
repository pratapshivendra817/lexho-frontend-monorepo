import { Megaphone } from "lucide-react";

export default function Header() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Megaphone className="text-purple-400" />
      <h1 className="text-2xl font-bold">Banners & Promotions</h1>
    </div>
  );
}