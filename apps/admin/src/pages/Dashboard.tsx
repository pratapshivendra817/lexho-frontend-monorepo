import DashboardCard from "../components/DashboardCard";
import RevenueChart from "../components/RevenueChart";
import ServicePieChart from "../components/ServicePieChart";
import { stats } from "../data/dashboardData";

export default function Dashboard() {
  return (
    <div className="bg-[#0f172a] min-h-screen p-6">
      <h1 className="text-white text-2xl font-bold mb-6">
        Dashboard Overview
      </h1>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((item, index) => (
          <DashboardCard key={index} {...item} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueChart />
        <ServicePieChart />
      </div>
    </div>
  );
}