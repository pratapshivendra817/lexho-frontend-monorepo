import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSearchParams: vi.fn(),
  useDebounce: vi.fn(),
  useBannersQuery: vi.fn(),
  useBannerStatsQuery: vi.fn(),
  useBannerMutations: vi.fn(),
  useMutation: vi.fn(),
  uploadBannerImage: vi.fn(),
  extractApiError: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  setSearchParams: vi.fn(),
  refetch: vi.fn(),
  statsRefetch: vi.fn(),
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
  reorderMutate: vi.fn(),
  uploadMutate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useSearchParams: mocks.useSearchParams,
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: mocks.useDebounce,
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: mocks.useMutation,
}));

vi.mock("@/features/banners/hooks/useBanners", () => ({
  useBannersQuery: mocks.useBannersQuery,
  useBannerStatsQuery: mocks.useBannerStatsQuery,
  useBannerMutations: mocks.useBannerMutations,
}));

vi.mock("@/features/banners/api/bannersApi", () => ({
  uploadBannerImage: mocks.uploadBannerImage,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.success,
    error: mocks.error,
  },
}));

vi.mock("@/components/admin", () => ({
  DataState: ({
    isLoading,
    isError,
    isEmpty,
    loadingText,
    errorText,
    emptyText,
    onRetry,
    children,
  }: any) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  DataTable: ({ rows, columns }: any) => (
    <div>
      {rows.map((row: any) => (
        <div key={row.id}>
          {columns.map((column: any) => (
            <div key={column.key}>{column.render ? column.render(row) : row[column.key]}</div>
          ))}
        </div>
      ))}
    </div>
  ),
  Pagination: ({ page, onPageChange }: any) => (
    <div>
      <span>page-{page}</span>
      <button onClick={() => onPageChange(page + 1)}>next-page</button>
    </div>
  ),
  ConfirmDialog: ({ open, title, description, onConfirm }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onConfirm}>confirm-dialog</button>
      </div>
    ) : null,
  ModalFormLayout: ({ open, title, children }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        {children}
      </div>
    ) : null,
  StatCard: ({ title, value }: { title: string; value: string }) => (
    <div>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

import AddBannerCard from "@/features/banners/components/AddBannerCard";
import BannerCard from "@/features/banners/components/BannerCard";
import { BannersFiltersBar } from "@/features/banners/components/BannersFiltersBar";
import { BannersStatsCards } from "@/features/banners/components/BannersStatsCards";
import { BannerStatusBadge } from "@/features/banners/components/BannerStatusBadge";
import Header from "@/features/banners/components/Header";
import StatsBar from "@/features/banners/components/StatsBar";
import BannersPage from "@/features/banners/pages/BannersPage";

describe("banners components and page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDebounce.mockImplementation((value) => value);
    mocks.extractApiError.mockImplementation((_error, fallback) => fallback);
    mocks.useSearchParams.mockReturnValue([new URLSearchParams("page=0&search=hello"), mocks.setSearchParams]);
    mocks.useBannersQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "banner-1",
            title: "Offer",
            subtitle: "Save more",
            imageUrl: "https://cdn.example.com/offer.jpg",
            priority: 2,
            active: true,
            bannerType: "PROMO",
            audience: "CUSTOMER",
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.useBannerStatsQuery.mockReturnValue({
      data: { total: 1, active: 1, inactive: 0, customer: 1, partner: 0, both: 0 },
      refetch: mocks.statsRefetch,
    });
    mocks.useBannerMutations.mockReturnValue({
      createBannerMutation: {
        isPending: false,
        mutate: mocks.createMutate.mockImplementation((_payload, options) => options?.onSuccess?.()),
      },
      updateBannerMutation: {
        isPending: false,
        mutate: mocks.updateMutate.mockImplementation((_payload, options) => options?.onSuccess?.()),
      },
      deleteBannerMutation: {
        isPending: false,
        mutate: mocks.deleteMutate.mockImplementation((_id, options) => options?.onSuccess?.()),
      },
      reorderBannersMutation: {
        isPending: false,
        mutate: mocks.reorderMutate,
      },
    });
    mocks.useMutation.mockReturnValue({
      isPending: false,
      mutate: mocks.uploadMutate.mockImplementation((_file, options) => options?.onSuccess?.("https://cdn.example.com/uploaded.jpg")),
    });
  });

  it("renders banner leaf components and emits filter callbacks", () => {
    const onSearchChange = vi.fn();
    const onAudienceChange = vi.fn();
    const onReset = vi.fn();

    render(
      <>
        <BannerStatusBadge active />
        <BannersStatsCards stats={{ total: 6, active: 4, inactive: 2, customer: 2, partner: 1, both: 3 }} />
        <BannersFiltersBar
          search="promo"
          audience="CUSTOMER"
          onSearchChange={onSearchChange}
          onAudienceChange={onAudienceChange}
          onReset={onReset}
        />
        <AddBannerCard />
        <Header />
        <StatsBar />
        <BannerCard banner={{ title: "Summer", tag: "PROMO", status: "ACTIVE", slot: 2 }} />
      </>,
    );

    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("Add New Banner")).toBeInTheDocument();
    expect(screen.getByText("Banners & Promotions")).toBeInTheDocument();
    expect(screen.getByText("Revenue via Promos")).toBeInTheDocument();
    expect(screen.getByText("Summer")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "ACTIVE • Slot 2")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search banners"), { target: { value: "sale" } });
    expect(onSearchChange).toHaveBeenCalledWith("sale");
    fireEvent.change(screen.getByDisplayValue("CUSTOMER"), { target: { value: "PARTNER" } });
    expect(onAudienceChange).toHaveBeenCalledWith("PARTNER");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalled();
  });

  it("handles create, update, upload, delete, reorder, filters, and pagination flows", async () => {
    const { container } = render(<BannersPage />);

    expect(screen.getByText("Home Banners")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Reorder" }));
    expect(mocks.reorderMutate).toHaveBeenCalledWith({ items: [{ id: "banner-1", priority: 2 }] });

    fireEvent.change(screen.getByDisplayValue("2"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Reorder" }));
    expect(mocks.reorderMutate).toHaveBeenLastCalledWith({ items: [{ id: "banner-1", priority: 4 }] });

    fireEvent.click(screen.getByRole("button", { name: "+ Create Banner" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New Banner" } });
    fireEvent.change(screen.getByLabelText("Subtitle"), { target: { value: "More offers" } });

    const file = new File(["img"], "banner.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Image uploaded"));

    fireEvent.submit(container.querySelector("#banner-form")!);
    await waitFor(() => expect(mocks.createMutate).toHaveBeenCalled());
    expect(mocks.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Banner",
        subtitle: "More offers",
        imageUrl: "https://cdn.example.com/uploaded.jpg",
      }),
      expect.any(Object),
    );
    expect(mocks.success).toHaveBeenCalledWith("Banner created");

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated Banner" } });
    fireEvent.submit(container.querySelector("#banner-form")!);
    await waitFor(() => expect(mocks.updateMutate).toHaveBeenCalled());
    expect(mocks.success).toHaveBeenCalledWith("Banner updated");

    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete Banner")).toBeInTheDocument();
    fireEvent.click(screen.getByText("confirm-dialog"));
    await waitFor(() => expect(mocks.deleteMutate).toHaveBeenCalledWith("banner-1", expect.any(Object)));
    expect(mocks.success).toHaveBeenCalledWith("Banner deleted");

    fireEvent.change(screen.getByPlaceholderText("Search banners"), { target: { value: "fresh" } });
    expect(mocks.setSearchParams).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Partner" }));
    expect(mocks.setSearchParams).toHaveBeenCalled();
    fireEvent.click(screen.getByText("next-page"));
    expect(screen.getByText("page-1")).toBeInTheDocument();
  });

  it("covers validation, list state fallbacks, and mutation error branches", async () => {
    mocks.useBannersQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
      refetch: mocks.refetch,
    });
    const loadingView = render(<BannersPage />);
    expect(screen.getByText("Loading banners...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.useBannersQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });
    const errorView = render(<BannersPage />);
    fireEvent.click(screen.getByText("Failed to load banners"));
    expect(mocks.refetch).toHaveBeenCalled();
    expect(mocks.statsRefetch).toHaveBeenCalled();
    errorView.unmount();

    mocks.useBannersQuery.mockReturnValueOnce({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    const emptyView = render(<BannersPage />);
    expect(screen.getByText("No banners found")).toBeInTheDocument();
    emptyView.unmount();

    mocks.useBannersQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "banner-2",
            title: "",
            subtitle: "",
            imageUrl: "",
            priority: 0,
            active: false,
            bannerType: "INFO",
            audience: "PARTNER",
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.useBannerMutations.mockReturnValue({
      createBannerMutation: {
        isPending: false,
        mutate: mocks.createMutate.mockImplementation((_payload, options) => options?.onError?.(new Error("create fail"))),
      },
      updateBannerMutation: {
        isPending: false,
        mutate: mocks.updateMutate.mockImplementation((_payload, options) => options?.onError?.(new Error("update fail"))),
      },
      deleteBannerMutation: {
        isPending: false,
        mutate: mocks.deleteMutate.mockImplementation((_id, options) => options?.onError?.(new Error("delete fail"))),
      },
      reorderBannersMutation: {
        isPending: false,
        mutate: mocks.reorderMutate,
      },
    });
    mocks.useMutation.mockReturnValue({
      isPending: false,
      mutate: mocks.uploadMutate.mockImplementation((_file, options) => options?.onError?.(new Error("upload fail"))),
    });

    const { container } = render(<BannersPage />);
    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.getByText("INACTIVE")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Create Banner" }));
    fireEvent.submit(container.querySelector("#banner-form")!);
    expect(mocks.error).toHaveBeenCalledWith("Title is required");

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Needs image" } });
    fireEvent.submit(container.querySelector("#banner-form")!);
    expect(mocks.error).toHaveBeenCalledWith("Image URL is required");

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Upload test" } });
    const file = new File(["bad"], "bad.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Image upload failed"));
  });
});
