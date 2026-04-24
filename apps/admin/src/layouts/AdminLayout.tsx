import { Outlet, Link, useLocation } from "react-router-dom";

export default function AdminLayout() {
  const location = useLocation();

  const navItem = (path: string) => {
    const isActive =
      path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(path);

    return `flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
      isActive
        ? "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg border-l-4 border-purple-400"
        : "hover:bg-gray-800 text-gray-300"
    }`;
  };

  // ✅ Page Title
  const getPageTitle = () => {
    if (location.pathname.startsWith("/users/")) return "User Profile";
    if (location.pathname.startsWith("/users")) return "Users";

    if (location.pathname.startsWith("/bookings/")) return "Booking Details";
    if (location.pathname.startsWith("/bookings")) return "Bookings";

    if (location.pathname.startsWith("/providers/"))
      return "Provider Verification";
    if (location.pathname.startsWith("/providers"))
      return "Providers";

    if (location.pathname.startsWith("/services")) return "Services";
    if (location.pathname.startsWith("/banners")) return "Banners";

    if (location.pathname.startsWith("/reviews"))
      return "Ratings & Reviews";

    if (location.pathname.startsWith("/notifications"))
      return "Notification Center";

    if (location.pathname.startsWith("/payouts"))
      return "Provider Payouts";

    if (location.pathname.startsWith("/activity-logs"))
      return "Activity Logs";

    // ✅ NEW: Support
    if (location.pathname.startsWith("/support"))
      return "Support & Complaints";

    return "Dashboard";
  };

  // ✅ Breadcrumb
  const getBreadcrumb = () => {
    if (location.pathname.startsWith("/users/"))
      return "Users / Profile";

    if (location.pathname.startsWith("/bookings/"))
      return "Bookings / Details";

    if (location.pathname.startsWith("/providers/"))
      return "Providers / Verification";

    if (location.pathname.startsWith("/notifications"))
      return "Communication / Notifications";

    if (location.pathname.startsWith("/payouts"))
      return "Finance / Payouts";

    if (location.pathname.startsWith("/reviews"))
      return "Reviews";

    if (location.pathname.startsWith("/activity-logs"))
      return "Audit / Activity Logs";

    // ✅ NEW: Support
    if (location.pathname.startsWith("/support"))
      return "Support / Tickets";

    const path = location.pathname.replace("/", "");
    return path || "dashboard";
  };

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-white">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#020617] p-5 border-r border-gray-800">
        <h2 className="text-xl font-bold mb-6 tracking-wide">
          🚀 Lexho Admin
        </h2>

        <nav className="flex flex-col gap-2">

          <Link to="/" className={navItem("/")}>
            🏠 Dashboard
          </Link>

          <Link to="/users" className={navItem("/users")}>
            👤 Users
          </Link>

          <Link to="/bookings" className={navItem("/bookings")}>
            📅 Bookings
          </Link>

          <Link to="/providers" className={navItem("/providers")}>
            🧑‍🔧 Providers
          </Link>

          <Link to="/services" className={navItem("/services")}>
            🛠 Services
          </Link>

          <Link to="/banners" className={navItem("/banners")}>
            🖼 Banners
          </Link>

          <Link to="/reviews" className={navItem("/reviews")}>
            ⭐ Reviews
          </Link>

          <Link to="/notifications" className={navItem("/notifications")}>
            🔔 Notifications
          </Link>

          {/* ✅ NEW: Support */}
          <Link to="/support" className={navItem("/support")}>
            🎫 Support
          </Link>

          <Link to="/payouts" className={navItem("/payouts")}>
            💰 Payouts
          </Link>

          <Link to="/activity-logs" className={navItem("/activity-logs")}>
            📜 Activity Logs
          </Link>

        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {getPageTitle()}
            </h1>

            <p className="text-sm text-gray-400 mt-1">
              {getBreadcrumb()}
            </p>
          </div>
        </div>

        {/* Page Content */}
        <div className="bg-[#020617] p-4 rounded-xl border border-gray-800 shadow-inner">
          <Outlet />
        </div>

      </main>
    </div>
  );
}