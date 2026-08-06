import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const rechartsProps = vi.hoisted(() => ({
  responsive: [] as Array<Record<string, unknown>>,
  barCharts: [] as Array<Record<string, unknown>>,
  pies: [] as Array<Record<string, unknown>>,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children, ...props }: { children: ReactNode }) => {
    rechartsProps.responsive.push(props);
    return <div data-testid="responsive-container">{children}</div>;
  },
  BarChart: ({ children, ...props }: { children: ReactNode }) => {
    rechartsProps.barCharts.push(props);
    return <div data-testid="bar-chart">{children}</div>;
  },
  Bar: ({ dataKey, name }: { dataKey: string; name?: string }) => <div>{`${name ?? dataKey}:${dataKey}`}</div>,
  XAxis: ({ dataKey }: { dataKey: string }) => <div>{`x:${dataKey}`}</div>,
  YAxis: () => <div>y-axis</div>,
  Tooltip: () => <div>tooltip</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children, ...props }: { children: ReactNode }) => {
    rechartsProps.pies.push(props);
    return <div>{children}</div>;
  },
  Cell: ({ fill }: { fill: string }) => <div>{fill}</div>,
}));

describe("dashboard components", () => {
  it("renders DashboardCard content", async () => {
    const { DashboardCard } = await import("@/features/dashboard");

    render(<DashboardCard title="Revenue" value="1000" growth="+10%" />);

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
    expect(screen.getByText("+10%")).toBeInTheDocument();
  });

  it("renders RevenueChart with default and custom data", async () => {
    const { RevenueChart } = await import("@/features/dashboard");

    const { rerender } = render(<RevenueChart />);
    expect(screen.getByText("Monthly Bookings & Revenue")).toBeInTheDocument();
    expect(screen.getByText("bookings:bookings")).toBeInTheDocument();
    expect(screen.getByText("revenue:revenue")).toBeInTheDocument();
    expect(rechartsProps.responsive[0]).toMatchObject({ width: "100%", height: 300 });

    rerender(<RevenueChart data={[{ name: "Jul", bookings: 10, revenue: 20 }]} />);
    expect(rechartsProps.barCharts.at(-1)).toMatchObject({ data: [{ name: "Jul", bookings: 10, revenue: 20 }] });
  });

  it("renders ServicePieChart with default and custom data", async () => {
    const { ServicePieChart } = await import("@/features/dashboard");

    const { rerender } = render(<ServicePieChart />);
    expect(screen.getByText("Services Distribution")).toBeInTheDocument();
    expect(screen.getByText("#06b6d4")).toBeInTheDocument();
    expect(screen.getByText("#eab308")).toBeInTheDocument();

    rerender(<ServicePieChart data={[{ name: "Custom", value: 99 }]} />);
    expect(rechartsProps.pies.at(-1)).toMatchObject({
      data: [{ name: "Custom", value: 99 }],
      innerRadius: 60,
      outerRadius: 100,
      dataKey: "value",
    });
  });

  it("exports seeded dashboard data sets", async () => {
    const { stats, monthlyData, pieData } = await import("@/features/dashboard");

    expect(stats[0]).toMatchObject({ title: "Total Users", value: "12,480" });
    expect(stats[2]?.title).toBe("Revenue");
    expect(monthlyData[0]).toMatchObject({ name: "Jan", bookings: 1800, revenue: 400 });
    expect(pieData[3]).toMatchObject({ name: "Others", value: 8 });
  });
});
