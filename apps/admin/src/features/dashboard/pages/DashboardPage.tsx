import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Legend,
} from "recharts";
import { useState } from "react";

import { DataState, SegmentedTabs, Skeleton, StatCard, StatusBadge } from "@/components/admin";
import { fetchMonitoringDashboard } from "@/features/operations/api";
import { getServiceAnalytics, getServiceSummary, getTopServices } from "@/services/lexhoAdminApi";
import NotificationsPage from "../../notifications/pages/NotificationsPage";
import ReviewsPage from "../../reviews/pages/ReviewsPage";

type DashboardMode = "dashboard" | "notifications" | "reviews";
type MonitoringState = "healthy" | "warning" | "critical";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMonitoringState(statuses: string[]): MonitoringState {
  const normalized = statuses.map((status) => String(status).toUpperCase());
  if (normalized.some((status) => status === "DOWN")) {
    return "critical";
  }
  if (normalized.some((status) => status === "DEGRADED" || status === "UNKNOWN")) {
    return "warning";
  }
  return "healthy";
}

export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>("dashboard");
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "service-summary"],
    queryFn: getServiceSummary,
    retry: false,
  });

  const topServicesQuery = useQuery({
    queryKey: ["dashboard", "top-services"],
    queryFn: () => getTopServices(10),
    retry: false,
  });

  const analyticsQuery = useQuery({
    queryKey: ["dashboard", "service-analytics"],
    queryFn: getServiceAnalytics,
    retry: false,
  });

  const monitoringQuery = useQuery({
    queryKey: ["monitoring-dashboard"],
    queryFn: fetchMonitoringDashboard,
    retry: false,
    refetchInterval: 30000,
  });

  const isLoading = summaryQuery.isLoading || topServicesQuery.isLoading || analyticsQuery.isLoading;
  const isError = summaryQuery.isError || topServicesQuery.isError || analyticsQuery.isError;

  const summary = summaryQuery.data;
  const topServices = topServicesQuery.data ?? [];
  const analytics = analyticsQuery.data ?? [];
  const monitoringStatuses = monitoringQuery.data
    ? [
        monitoringQuery.data.health.system,
        monitoringQuery.data.health.api,
        monitoringQuery.data.health.redis,
        monitoringQuery.data.health.database,
      ]
    : [];
  const monitoringState = getMonitoringState(monitoringStatuses);

  const isEmpty = !summary || (topServices.length === 0 && analytics.length === 0);

  if (mode === "notifications") {
    return (
      <div className="space-y-6">
        <SegmentedTabs items={dashboardModeTabs} value={mode} onChange={setMode} />
        <NotificationsPage />
      </div>
    );
  }

  if (mode === "reviews") {
    return (
      <div className="space-y-6">
        <SegmentedTabs items={dashboardModeTabs} value={mode} onChange={setMode} />
        <ReviewsPage />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SegmentedTabs items={dashboardModeTabs} value={mode} onChange={setMode} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">System Monitoring</h2>
          <span className="text-xs text-[var(--color-muted)]">Auto refreshes every 30 seconds</span>
        </div>
        {monitoringQuery.data && monitoringState !== "healthy" ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              monitoringState === "critical"
                ? "border-red-500/40 bg-red-950/20 text-red-100"
                : "border-amber-500/40 bg-amber-950/20 text-amber-100"
            }`}
          >
            <p className="font-semibold">
              {monitoringState === "critical" ? "Critical system warning" : "System warning detected"}
            </p>
            <p className="mt-1">
              {monitoringState === "critical"
                ? "One or more monitoring services are down. Please review the health cards below."
                : "One or more monitoring services are degraded or unknown. Please review the health cards below."}
            </p>
          </div>
        ) : null}
        <DataState
          isLoading={monitoringQuery.isLoading}
          isError={monitoringQuery.isError}
          isEmpty={!monitoringQuery.data}
          loadingText="Loading system health..."
          errorText="Failed to load system monitoring"
          onRetry={() => void monitoringQuery.refetch()}
        >
          {monitoringQuery.data ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["System Health", monitoringQuery.data.health.system],
                  ["API Health", monitoringQuery.data.health.api],
                  ["Redis Health", monitoringQuery.data.health.redis],
                  ["Database Health", monitoringQuery.data.health.database],
                ].map(([label, status]) => (
                  <article key={label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
                    <div className="mt-3"><StatusBadge status={status} /></div>
                  </article>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Orders Created", monitoringQuery.data.metrics.ordersCreated],
                  ["Orders Completed", monitoringQuery.data.metrics.ordersCompleted],
                  ["Payments Success", monitoringQuery.data.metrics.paymentsSuccess],
                  ["Payments Failed", monitoringQuery.data.metrics.paymentsFailed],
                  ["Partner Online", monitoringQuery.data.metrics.partnerOnlineCount],
                ].map(([label, value]) => (
                  <article key={label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </DataState>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={`dashboard-skeleton-${index}`} className="rounded-xl border border-[var(--color-border)] p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-20" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-64 w-full" />
            </div>
            <div className="rounded-xl border border-[var(--color-border)] p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-64 w-full" />
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading ? (
        <DataState
          isLoading={false}
          isError={isError}
          isEmpty={isEmpty}
          loadingText="Loading dashboard metrics..."
          errorText="Failed to load dashboard"
          emptyText="No dashboard data available"
          onRetry={() => {
            void summaryQuery.refetch();
            void topServicesQuery.refetch();
            void analyticsQuery.refetch();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Total Services" value={String(summary?.totalServices ?? 0)} />
            <StatCard title="Active Services" value={String(summary?.activeServices ?? 0)} />
            <StatCard title="Inactive Services" value={String(summary?.inactiveServices ?? 0)} />
            <StatCard title="Total Bookings" value={String(summary?.totalBookings ?? 0)} />
            <StatCard title="Revenue" value={formatCurrency(summary?.totalRevenue ?? 0)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Top Services
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height={240} minWidth={0}>
                  <BarChart data={topServices}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="serviceName" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="bookings" fill="#60a5fa" radius={6} name="Bookings" />
                    <Bar dataKey="revenue" fill="#34d399" radius={6} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Booking Analytics
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height={240} minWidth={0}>
                  <AreaChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="bookings" stroke="#60a5fa" fill="#60a5fa33" name="Bookings" />
                    <Area type="monotone" dataKey="revenue" stroke="#34d399" fill="#34d39933" name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </DataState>
      ) : null}
    </div>
  );
}

const dashboardModeTabs: Array<{ label: string; value: DashboardMode }> = [
  { label: "Dashboard", value: "dashboard" },
  { label: "Notification Center", value: "notifications" },
  { label: "Ratings & Reviews", value: "reviews" },
];
