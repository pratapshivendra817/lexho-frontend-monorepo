import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/banner/pages/BannerListPage", () => ({
  default: () => <div>Mock Banner List Page</div>,
}));

vi.mock("@/modules/banner/pages/BannerCreatePage", () => ({
  default: () => <div>Mock Banner Create Page</div>,
}));

vi.mock("@/modules/banner/pages/BannerEditPage", () => ({
  default: () => <div>Mock Banner Edit Page</div>,
}));

import * as bannerFeature from "@/modules/banner";
import {
  bannerManagementNavItems,
  bannerManagementRouteMeta,
  bannerManagementRoutes,
} from "@/modules/banner/module";

describe("banner module exports", () => {
  it("re-exports the banner module, hooks, api, and types from the barrel", () => {
    expect(bannerFeature.bannerManagementRoutes).toBe(bannerManagementRoutes);
    expect(bannerFeature.bannerManagementNavItems).toBe(bannerManagementNavItems);
    expect(bannerFeature.bannerManagementRouteMeta).toBe(bannerManagementRouteMeta);
    expect(bannerFeature.useBanners).toBeTypeOf("function");
    expect(bannerFeature.getAdminBanners).toBeTypeOf("function");
  });

  it("defines the banner routes, nav items, and metadata in precedence order", () => {
    expect(bannerManagementNavItems).toEqual([]);
    expect(bannerManagementRoutes).toHaveLength(1);
    expect(bannerManagementRoutes[0].path).toBe("/banner-management");
    expect(bannerManagementRoutes[0].children).toHaveLength(3);
    expect(bannerManagementRoutes[0].children?.[0].index).toBe(true);
    expect(bannerManagementRoutes[0].children?.[1].path).toBe("create");
    expect(bannerManagementRoutes[0].children?.[2].path).toBe(":id/edit");
    expect(bannerManagementRouteMeta).toEqual([
      {
        pathPrefix: "/banner-management/create",
        title: "Create Banner",
        breadcrumb: "banner management / create",
      },
      {
        pathPrefix: "/banner-management/",
        title: "Edit Banner",
        breadcrumb: "banner management / edit",
      },
      {
        pathPrefix: "/banner-management",
        title: "Category Banner Management",
        breadcrumb: "category banner management",
      },
    ]);
  });

  it("renders lazy banner routes through LazyScreen fallbacks", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/banner-management"]}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/banner-management" element={bannerManagementRoutes[0].children?.[0].element} />
            <Route path="/banner-management/create" element={bannerManagementRoutes[0].children?.[1].element} />
            <Route path="/banner-management/:id/edit" element={bannerManagementRoutes[0].children?.[2].element} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading module...")).toBeInTheDocument();
    await waitForElementToBeRemoved(() => screen.queryByText("Loading module..."));
    unmount();
  });
});
