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

import { DataState, Skeleton, StatCard } from "@/components/admin";
import { getServiceAnalytics, getServiceSummary, getTopServices } from "@/services/lexhoAdminApi";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
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

  const isLoading = summaryQuery.isLoading || topServicesQuery.isLoading || analyticsQuery.isLoading;
  const isError = summaryQuery.isError || topServicesQuery.isError || analyticsQuery.isError;

  const summary = summaryQuery.data;
  const topServices = topServicesQuery.data ?? [];
  const analytics = analyticsQuery.data ?? [];

  const isEmpty = !summary || (topServices.length === 0 && analytics.length === 0);

  return (
    <div className="space-y-6">
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
