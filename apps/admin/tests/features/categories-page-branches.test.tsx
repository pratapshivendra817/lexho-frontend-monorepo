import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  updateCategoryStatus: vi.fn(),
  deleteCategory: vi.fn(),
  uploadAdminImage: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  extractApiError: vi.fn(),
}));

vi.mock("@/services/lexhoAdminApi", () => ({
  getCategories: mocks.getCategories,
  createCategory: mocks.createCategory,
  updateCategory: mocks.updateCategory,
  updateCategoryStatus: mocks.updateCategoryStatus,
  deleteCategory: mocks.deleteCategory,
  uploadAdminImage: mocks.uploadAdminImage,
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

vi.mock("@/components/admin", async () => {
  return {
    SegmentedTabs: ({ items, value, onChange }: any) => (
      <div>
        {items.map((item: any) => (
          <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
    ),
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
    ImageUrlInput: ({ value, onChange, label }: any) => (
      <label>
        <span>{label}</span>
        <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    ),
    ModalFormLayout: ({ open, title, children, submitLabel, onClose, formId }: any) =>
      open ? (
        <div>
          <h3>{title}</h3>
          {children}
          <button type="submit" form={formId}>
            {submitLabel}
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      ) : null,
    ConfirmDialog: ({ open, title, description, onConfirm, onClose, confirmLabel }: any) =>
      open ? (
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
          <button onClick={onConfirm}>{confirmLabel ?? "Confirm"}</button>
          <button onClick={onClose}>Close dialog</button>
        </div>
      ) : null,
  };
});

vi.mock("@/modules/banner/pages/BannerListPage", () => ({
  default: () => <div>category-banner-list-page</div>,
}));

vi.mock("@/features/banners/pages/BannersPage", () => ({
  default: () => <div>embedded-banners-page</div>,
}));

import { renderWithProviders } from "../utils/renderWithProviders";
import CategoriesPage from "@/features/categories/pages/CategoriesPage";

describe("CategoriesPage branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractApiError.mockImplementation((_error, fallback) => fallback);
    mocks.getCategories.mockResolvedValue({
      items: [
        { id: "cat-2", name: "Zeta", iconUrl: "", active: false, displayOrder: 5 },
        { id: "cat-1", name: "Alpha", iconUrl: "https://example.com/a.png", active: true, displayOrder: 1 },
      ],
      total: 2,
    });
    mocks.createCategory.mockResolvedValue(undefined);
    mocks.updateCategory.mockResolvedValue(undefined);
    mocks.updateCategoryStatus.mockResolvedValue(undefined);
    mocks.deleteCategory.mockResolvedValue(undefined);
    mocks.uploadAdminImage.mockResolvedValue("https://example.com/uploaded.png");
  });

  it("covers loading, error, and empty states", async () => {
    mocks.getCategories.mockImplementationOnce(() => new Promise(() => {}));

    const loadingView = renderWithProviders(<CategoriesPage />);
    expect(screen.getByText("Loading categories...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.getCategories.mockRejectedValueOnce(new Error("boom"));
    const errorView = renderWithProviders(<CategoriesPage />);
    expect(await screen.findByText("Failed to load categories")).toBeInTheDocument();
    errorView.unmount();

    mocks.getCategories.mockResolvedValueOnce({ items: [], total: 0 });
    renderWithProviders(<CategoriesPage />);
    expect(await screen.findByText("No categories found")).toBeInTheDocument();
  });

  it("covers category listing, search, modes, edit, status toggle, delete, and reset flows", async () => {
    renderWithProviders(<CategoriesPage />);

    expect(await screen.findByText("2 categories")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("page-1")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search categories"), { target: { value: "plumb" } });
    expect(await screen.findByText("0 categories")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Category Banner Management"));
    expect(screen.getByText("embedded-banners-page")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Category Banner Mgmt"));
    expect(screen.getByText("category-banner-list-page")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Categories"));
    expect(await screen.findByText("Category Management")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Inactive"));
    await waitFor(() => expect(mocks.updateCategoryStatus).toHaveBeenCalledWith("cat-2", true));

    fireEvent.click(screen.getByText("+ Add Category"));
    expect(screen.getByText("Create Category")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Fresh" } });
    fireEvent.change(screen.getByLabelText("Icon Image"), { target: { value: "https://example.com/fresh.png" } });
    fireEvent.change(screen.getByLabelText("Display Order / Priority"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(mocks.createCategory).toHaveBeenCalled());
    expect(mocks.createCategory.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        name: "Fresh",
        iconUrl: "https://example.com/fresh.png",
        active: true,
        displayOrder: 6,
      }),
    );

    fireEvent.click(screen.getAllByText("Edit")[0]!);
    expect(screen.getByText("Edit Category")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alpha Prime" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(mocks.updateCategory).toHaveBeenCalledWith("cat-1", expect.objectContaining({ name: "Alpha Prime" })));

    fireEvent.click(screen.getAllByText("Delete")[0]!);
    fireEvent.click(screen.getAllByText("Delete").at(-1)!);
    await waitFor(() => expect(mocks.deleteCategory).toHaveBeenCalledWith("cat-1"));

    fireEvent.click(screen.getByText("next-page"));
    expect(await screen.findByText("page-2")).toBeInTheDocument();
  });
});
