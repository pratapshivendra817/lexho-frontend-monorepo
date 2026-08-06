import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import * as popularServicesFeature from "@/features/popular-services";
import { popularServicesNavItems, popularServicesRouteMeta, popularServicesRoutes } from "@/features/popular-services/module";

vi.mock("@/features/popular-services/pages/PopularServicesPage", () => ({
  default: () => <div>Mock Popular Services Page</div>,
}));

describe("popular services module", () => {
  it("re-exports route config from the feature barrel", () => {
    expect(popularServicesFeature.popularServicesRoutes).toBe(popularServicesRoutes);
    expect(popularServicesFeature.popularServicesNavItems).toBe(popularServicesNavItems);
    expect(popularServicesFeature.popularServicesRouteMeta).toBe(popularServicesRouteMeta);
  });

  it("defines the expected navigation and route metadata", () => {
    expect(popularServicesNavItems).toEqual([]);
    expect(popularServicesRouteMeta).toEqual([
      {
        pathPrefix: "/popular-services",
        title: "Popular Services",
        breadcrumb: "catalog / popular services",
      },
    ]);
  });

  it("defines the lazy-loaded popular-services route", async () => {
    expect(popularServicesRoutes).toHaveLength(1);
    expect(popularServicesRoutes[0].path).toBe("/popular-services");
    expect(popularServicesRoutes[0].children).toHaveLength(1);
    expect(popularServicesRoutes[0].children?.[0].index).toBe(true);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <MemoryRouter initialEntries={["/popular-services"]}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/popular-services" element={popularServicesRoutes[0].children?.[0].element} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading module...")).toBeInTheDocument();
    await waitForElementToBeRemoved(() => screen.queryByText("Loading module..."));
    expect(screen.getByText("Mock Popular Services Page")).toBeInTheDocument();
  });
});
