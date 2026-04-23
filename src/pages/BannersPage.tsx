import Header from "../components/Header";
import BannerCard from "../components/BannerCard";
import AddBannerCard from "../components/AddBannerCard";
import StatsBar from "../components/StatsBar";
import { banners } from "../data/banners";

export default function BannersPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6">
      <Header />

      {/* Grid */}
      <div className="grid grid-cols-3 gap-6">
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} />
        ))}

        <AddBannerCard />
      </div>

      <StatsBar />
    </div>
  );
}