import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  extractApiError: vi.fn((error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
  ),
  useBannerCategories: vi.fn(),
  useBanners: vi.fn(),
  useDeleteBanner: vi.fn(),
  useReorderBanners: vi.fn(),
  useCreateBanner: vi.fn(),
  useBannerById: vi.fn(),
  useUpdateBanner: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => mocks.useParams(),
  };
});

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.success,
    error: mocks.error,
  },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("@/modules/banner/hooks/useBanners", () => ({
  useBannerCategories: mocks.useBannerCategories,
  useBanners: mocks.useBanners,
  useDeleteBanner: mocks.useDeleteBanner,
  useReorderBanners: mocks.useReorderBanners,
  useCreateBanner: mocks.useCreateBanner,
  useBannerById: mocks.useBannerById,
  useUpdateBanner: mocks.useUpdateBanner,
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
    if (isError) {
      return (
        <div>
          <span>{errorText}</span>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      );
    }
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  ConfirmDialog: ({ open, description, onConfirm, onClose }: any) => (
    <div>
      <div>{open ? description : "Dialog Closed"}</div>
      <button type="button" onClick={onConfirm}>
        Confirm Delete
      </button>
      <button type="button" onClick={onClose}>
        Close Dialog
      </button>
    </div>
  ),
  Pagination: ({ page, total, limit, onPageChange }: any) => (
    <div>
      <span>{`Pagination:${page}/${total}/${limit}`}</span>
      <button type="button" onClick={() => onPageChange(2)}>
        Go To Page 2
      </button>
    </div>
  ),
}));

vi.mock("@/modules/banner/components/BannerForm", () => ({
  defaultBannerFormValues: {
    title: "",
    categoryId: "",
    imageUrl: "",
    redirectType: "CATEGORY",
    redirectValue: "",
    priority: 0,
    active: true,
  },
  BannerForm: ({ defaultValues, categories, isSubmitting, onSubmit }: any) => (
    <div>
      <div>{`Form title:${defaultValues.title}`}</div>
      <div>{`Form redirect:${defaultValues.redirectType}`}</div>
      <div>{`Form categories:${categories.length}`}</div>
      <div>{isSubmitting ? "Form Saving" : "Form Ready"}</div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            title: "Submitted Banner",
            categoryId: "3",
            imageUrl: "/banner.jpg",
            redirectType: "CATEGORY",
            redirectValue: "3",
            priority: 5,
            active: true,
          })
        }
      >
        Submit Banner Form
      </button>
    </div>
  ),
}));

vi.mock("@/modules/banner/components/BannerTable", () => ({
  BannerTable: ({ rows, isLoading, isError, onRetry, onEdit, onDelete, onMoveUp, onMoveDown }: any) => (
    <div>
      <div>{`BannerTable:${rows.map((row: any) => row.id).join(",")}`}</div>
      <div>{isLoading ? "Rows Loading" : "Rows Loaded"}</div>
      <div>{isError ? "Rows Error" : "Rows Healthy"}</div>
      <button type="button" onClick={onRetry}>
        Retry Banners
      </button>
      <button type="button" onClick={() => onEdit(rows[0])}>
        Trigger Edit
      </button>
      <button type="button" onClick={() => onDelete(rows[0])}>
        Trigger Delete
      </button>
      <button type="button" onClick={() => onMoveUp(rows[0])}>
        Trigger Up
      </button>
      <button type="button" onClick={() => onMoveDown(rows[0])}>
        Trigger Down
      </button>
    </div>
  ),
}));

import BannerCreatePage from "@/modules/banner/pages/BannerCreatePage";
import BannerEditPage from "@/modules/banner/pages/BannerEditPage";
import BannerListPage from "@/modules/banner/pages/BannerListPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const baseRows = [
  {
    id: "1",
    title: "First Banner",
    categoryId: "2",
    categoryName: "Cleaning",
    imageUrl: "/one.jpg",
    redirectType: "CATEGORY" as const,
    redirectValue: "2",
    status: "ACTIVE" as const,
    priority: 1,
    active: true,
  },
  {
    id: "2",
    title: "Second Banner",
    categoryId: "3",
    categoryName: "Cooking",
    imageUrl: "/two.jpg",
    redirectType: "CATEGORY" as const,
    redirectValue: "3",
    status: "ACTIVE" as const,
    priority: 2,
    active: true,
  },
];

describe("banner pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useParams.mockReturnValue({ id: "42" });
  });

  it("handles create page loading, retry, success, and error flows", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    const mutate = vi.fn();
    mocks.useBannerCategories
      .mockReturnValueOnce({ isLoading: true, isError: false, data: undefined, refetch })
      .mockReturnValueOnce({ isLoading: false, isError: true, data: undefined, refetch })
      .mockReturnValue({
        isLoading: false,
        isError: false,
        data: [{ id: "3", name: "Cooking" }],
        refetch,
      });
    mocks.useCreateBanner.mockReturnValue({
      isPending: false,
      mutate,
    });

    const first = renderWithProviders(<BannerCreatePage />);
    expect(screen.getByText("Loading banner form data...")).toBeInTheDocument();
    first.unmount();

    const second = renderWithProviders(<BannerCreatePage />);
    expect(screen.getByText("Unable to load categories")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    second.unmount();

    mutate.mockImplementationOnce((_values, options) => options.onSuccess());
    const successRender = renderWithProviders(<BannerCreatePage />);
    expect(screen.getByText("Form categories:1")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Submit Banner Form" }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Submitted Banner" }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(mocks.success).toHaveBeenCalledWith("Banner created");
    expect(mocks.navigate).toHaveBeenCalledWith("/banner-management");
    successRender.unmount();

    mutate.mockImplementationOnce((_values, options) => options.onError(new Error("create broke")));
    renderWithProviders(<BannerCreatePage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Submit Banner Form" }));
    expect(mocks.extractApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to create banner");
    expect(mocks.error).toHaveBeenCalledWith("create broke");
  });

  it("handles edit page loading, empty, retry, success, missing id, and error flows", async () => {
    const bannerRefetch = vi.fn().mockResolvedValue(undefined);
    const categoryRefetch = vi.fn().mockResolvedValue(undefined);
    const mutate = vi.fn();
    mocks.useBannerCategories.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ id: "2", name: "Cleaning" }],
      refetch: categoryRefetch,
    });
    mocks.useUpdateBanner.mockReturnValue({
      isPending: false,
      mutate,
    });

    mocks.useBannerById.mockReturnValueOnce({
      isLoading: true,
      isError: false,
      data: undefined,
      refetch: bannerRefetch,
    });
    const loading = renderWithProviders(<BannerEditPage />);
    expect(screen.getByText("Loading banner...")).toBeInTheDocument();
    loading.unmount();

    mocks.useBannerById.mockReturnValueOnce({
      isLoading: false,
      isError: true,
      data: undefined,
      refetch: bannerRefetch,
    });
    const errored = renderWithProviders(<BannerEditPage />);
    expect(screen.getByText("Unable to load banner form data")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(bannerRefetch).toHaveBeenCalledTimes(1);
    expect(categoryRefetch).toHaveBeenCalledTimes(1);
    errored.unmount();

    mocks.useBannerById.mockReturnValueOnce({
      isLoading: false,
      isError: false,
      data: null,
      refetch: bannerRefetch,
    });
    const empty = renderWithProviders(<BannerEditPage />);
    expect(screen.getByText("Banner not found")).toBeInTheDocument();
    empty.unmount();

    mocks.useBannerById.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        ...baseRows[0],
        redirectType: "SERVICE",
      },
      refetch: bannerRefetch,
    });
    mutate.mockImplementationOnce((_values, options) => options.onSuccess());
    const successRender = renderWithProviders(<BannerEditPage />);
    expect(screen.getByText("Form title:First Banner")).toBeInTheDocument();
    expect(screen.getByText("Form redirect:CATEGORY")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Submit Banner Form" }));
    expect(mutate).toHaveBeenCalledWith(
      {
        id: "42",
        payload: expect.objectContaining({ title: "Submitted Banner" }),
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(mocks.success).toHaveBeenCalledWith("Banner updated");
    expect(mocks.navigate).toHaveBeenCalledWith("/banner-management");
    successRender.unmount();

    mocks.useParams.mockReturnValueOnce({});
    const missingIdRender = renderWithProviders(<BannerEditPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Submit Banner Form" }));
    expect(mutate).toHaveBeenCalledTimes(1);
    missingIdRender.unmount();

    mutate.mockImplementationOnce((_values, options) => options.onError(new Error("update broke")));
    renderWithProviders(<BannerEditPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Submit Banner Form" }));
    expect(mocks.extractApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to update banner");
    expect(mocks.error).toHaveBeenCalledWith("update broke");
  });

  it("maps edit defaults for null category ids and missing category lists", () => {
    mocks.useBannerById.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        ...baseRows[0],
        categoryId: null,
        redirectType: "EXTERNAL",
      },
      refetch: vi.fn(),
    });
    mocks.useBannerCategories.mockReturnValue({
      isLoading: false,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    });
    mocks.useUpdateBanner.mockReturnValue({
      isPending: true,
      mutate: vi.fn(),
    });

    renderWithProviders(<BannerEditPage />);
    expect(screen.getByText("Form redirect:EXTERNAL")).toBeInTheDocument();
    expect(screen.getByText("Form categories:0")).toBeInTheDocument();
    expect(screen.getByText("Form Saving")).toBeInTheDocument();
  });

  it("handles list page filters, navigation, retry, reorder, and delete flows", async () => {
    const bannersRefetch = vi.fn().mockResolvedValue(undefined);
    const deleteMutate = vi.fn();
    const reorderMutate = vi.fn();
    mocks.useBannerCategories.mockReturnValue({
      data: [
        { id: "2", name: "Cleaning" },
        { id: "3", name: "Cooking" },
      ],
    });
    mocks.useBanners.mockReturnValue({
      data: { items: baseRows, total: 2 },
      isLoading: false,
      isError: false,
      refetch: bannersRefetch,
    });
    mocks.useDeleteBanner.mockReturnValue({
      mutate: deleteMutate,
    });
    mocks.useReorderBanners.mockReturnValue({
      isPending: false,
      mutate: reorderMutate,
    });

    renderWithProviders(<BannerListPage />);

    expect(mocks.useBanners).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      search: undefined,
      categoryId: undefined,
      active: undefined,
    });
    expect(screen.getByText("2 banners")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Order" })).toBeDisabled();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Search by title"), "hero");
    await user.selectOptions(screen.getAllByRole("combobox")[0], "3");
    await user.selectOptions(screen.getAllByRole("combobox")[1], "false");
    await user.click(screen.getByRole("button", { name: "Go To Page 2" }));

    expect(mocks.useBanners).toHaveBeenLastCalledWith({
      page: 2,
      limit: 10,
      search: "hero",
      categoryId: "3",
      active: false,
    });

    await user.click(screen.getByRole("button", { name: "Retry Banners" }));
    expect(bannersRefetch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "+ Create Banner" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/banner-management/create");

    await user.click(screen.getByRole("button", { name: "Trigger Edit" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/banner-management/1/edit");

    reorderMutate.mockImplementationOnce((_ids, options) => options.onSuccess());
    await user.click(screen.getByRole("button", { name: "Trigger Down" }));
    expect(screen.getByRole("button", { name: "Save Order" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Save Order" }));
    expect(reorderMutate).toHaveBeenCalledWith(
      ["2", "1"],
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(mocks.success).toHaveBeenCalledWith("Banner order updated");

    reorderMutate.mockImplementationOnce((_ids, options) => options.onError(new Error("reorder broke")));
    await user.click(screen.getByRole("button", { name: "Save Order" }));
    expect(mocks.extractApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to reorder banners");
    expect(mocks.error).toHaveBeenCalledWith("reorder broke");

    deleteMutate.mockImplementationOnce((_id, options) => options.onSuccess());
    await user.click(screen.getByRole("button", { name: "Trigger Delete" }));
    expect(screen.getByText('Delete "Second Banner"?')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(deleteMutate).toHaveBeenCalledWith(
      "2",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(mocks.success).toHaveBeenCalledWith("Banner deleted");
    await waitFor(() => expect(screen.getByText("Dialog Closed")).toBeInTheDocument());

    deleteMutate.mockImplementationOnce((_id, options) => options.onError(new Error("delete broke")));
    await user.click(screen.getByRole("button", { name: "Trigger Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(mocks.extractApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to delete banner");
    expect(mocks.error).toHaveBeenCalledWith("delete broke");

    await user.click(screen.getByRole("button", { name: "Close Dialog" }));
    expect(screen.getByText("Dialog Closed")).toBeInTheDocument();
  });

  it("shows list page pending reorder state", () => {
    mocks.useBannerCategories.mockReturnValue({ data: [] });
    mocks.useBanners.mockReturnValue({
      data: { items: baseRows, total: 2 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useDeleteBanner.mockReturnValue({ mutate: vi.fn() });
    mocks.useReorderBanners.mockReturnValue({
      isPending: true,
      mutate: vi.fn(),
    });

    renderWithProviders(<BannerListPage />);
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });

  it("keeps save order disabled for single-row no-op moves and ignores delete confirm without a target", async () => {
    const deleteMutate = vi.fn();
    mocks.useBannerCategories.mockReturnValue({ data: undefined });
    mocks.useBanners.mockReturnValue({
      data: { items: [baseRows[0]], total: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useDeleteBanner.mockReturnValue({ mutate: deleteMutate });
    mocks.useReorderBanners.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });

    renderWithProviders(<BannerListPage />);
    expect(screen.getByText("Dialog Closed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Order" })).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Trigger Up" }));
    await user.click(screen.getByRole("button", { name: "Trigger Down" }));
    expect(screen.getByRole("button", { name: "Save Order" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(deleteMutate).not.toHaveBeenCalled();
  });
});
