import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/services/pages/ServicesPage", () => ({
  default: () => <div>Mock Services Page</div>,
}));

vi.mock("@/features/services/pages/ServiceDetailsPage", () => ({
  default: () => <div>Mock Service Details Page</div>,
}));

import * as servicesFeature from "@/features/services";
import { CategoryCard, ServiceTable } from "@/features/services/components";
import { services } from "@/features/services/data";
import * as servicesPages from "@/features/services/pages";
import { servicesNavItems, servicesRouteMeta, servicesRoutes } from "@/features/services/module";

describe("services feature exports and module config", () => {
  it("exports the mock services data with expected active and inactive entries", () => {
    expect(services).toHaveLength(4);
    expect(services[0]).toMatchObject({
      name: "Bathroom Clean",
      category: "Cleaning",
      status: "Active",
    });
    expect(services.at(-1)).toMatchObject({
      name: "Non-Veg Cook",
      category: "Cook",
      status: "Inactive",
    });
  });

  it("re-exports components, pages, and module symbols from the feature barrel", () => {
    expect(servicesFeature.CategoryCard).toBe(CategoryCard);
    expect(servicesFeature.ServiceTable).toBe(ServiceTable);
    expect(servicesFeature.services).toBe(services);
    expect(servicesFeature.servicesRoutes).toBe(servicesRoutes);
    expect(servicesFeature.servicesNavItems).toBe(servicesNavItems);
    expect(servicesFeature.servicesRouteMeta).toBe(servicesRouteMeta);
  });

  it("defines navigation items and route metadata in details-first order", () => {
    expect(servicesNavItems).toEqual([{ path: "/services", label: "Services" }]);
    expect(servicesRouteMeta).toEqual([
      {
        pathPrefix: "/services/",
        title: "Service Details",
        breadcrumb: "catalog / services / details",
      },
      {
        pathPrefix: "/services",
        title: "Services",
        breadcrumb: "catalog / services",
      },
    ]);
  });

  it("defines list and detail routes and renders their lazy fallbacks", async () => {
    expect(servicesRoutes).toHaveLength(1);
    expect(servicesRoutes[0].path).toBe("/services");
    expect(servicesRoutes[0].children).toHaveLength(2);
    expect(servicesRoutes[0].children?.[0].index).toBe(true);
    expect(servicesRoutes[0].children?.[1].path).toBe(":id");

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/services"]}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/services" element={servicesRoutes[0].children?.[0].element} />
            <Route path="/services/:id" element={servicesRoutes[0].children?.[1].element} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading module...")).toBeInTheDocument();
    await waitForElementToBeRemoved(() => screen.queryByText("Loading module..."));
    unmount();
  });

  it("re-exports the page components from the pages barrel", () => {
    expect(servicesPages.ServicesPage).toBeTypeOf("function");
    expect(servicesPages.ServiceDetailsPage).toBeTypeOf("function");
    expect("ServicesPage" in servicesFeature).toBe(false);
    expect("ServiceDetailsPage" in servicesFeature).toBe(false);
  });
});
