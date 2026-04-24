import CategoryCard from "../components/CategoryCard";
import ServiceTable from "../components/ServiceTable";
import  { services } from "../data/mockData";
import { Utensils, Brush, Wrench, Layers } from "lucide-react";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* Header */}
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        🔧 Services & Categories
      </h1>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        <CategoryCard
          title="Cook"
          services={14}
          bookings={1100}
          color="border-orange-500"
          bg="bg-orange-500"
          icon={<Utensils />}
        />

        <CategoryCard
          title="Clean"
          services={18}
          bookings={1540}
          color="border-teal-500"
          bg="bg-teal-500"
          icon={<Brush />}
        />

        <CategoryCard
          title="Repair"
          services={12}
          bookings={730}
          color="border-purple-500"
          bg="bg-purple-500"
          icon={<Wrench />}
        />

        <CategoryCard
          title="All / Other"
          services={8}
          bookings={284}
          color="border-yellow-500"
          bg="bg-yellow-500"
          icon={<Layers />}
        />

      </div>

      {/* Table */}
      <ServiceTable data={services} />
    </div>
  );
}