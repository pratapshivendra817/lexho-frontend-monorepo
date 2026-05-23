import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";

import { ThemeToggle } from "@/components/admin";
import { clearAccessToken } from "@/utils/authSession";
import { adminNavItems, getAdminRouteMeta } from "../navigation/adminNavigation";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeMeta = getAdminRouteMeta(location.pathname);

  const handleLogout = () => {
    clearAccessToken();
    navigate("/login", { replace: true });
  };

  const navItemClass = (path: string) => {
    const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

    return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
        : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
    }`;
  };

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)] md:pl-72">
      <aside className="relative z-30 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 backdrop-blur md:fixed md:inset-y-0 md:left-0 md:h-screen md:w-72 md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
        <h2 className="mb-1 text-xl font-bold tracking-wide">LexhoAdmin</h2>
        <p className="mb-6 text-xs uppercase tracking-wide text-[var(--color-muted)]">Home Services Control Center</p>

        <nav className="grid grid-cols-2 gap-1 md:grid-cols-1">
          {adminNavItems.map((item) => (
            <Link key={item.path} to={item.path} className={navItemClass(item.path)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-h-screen overflow-x-hidden p-4 md:h-screen md:overflow-y-auto md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">{routeMeta.title}</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{routeMeta.breadcrumb}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
              <FiSearch size={14} />
              <input
                type="text"
                placeholder="Quick search"
                className="w-32 bg-transparent text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)] sm:w-36"
              />
            </label>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-400/30 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-inner sm:p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
