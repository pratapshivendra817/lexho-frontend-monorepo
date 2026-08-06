import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CategoriesPage from "@/features/categories/pages/CategoriesPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  updateCategoryStatus: vi.fn(),
  deleteCategory: vi.fn(),
  uploadAdminImage: vi.fn(),
}));

vi.mock("@/services/lexhoAdminApi", () => ({
  getCategories: mocks.getCategories,
  createCategory: mocks.createCategory,
  updateCategory: mocks.updateCategory,
  updateCategoryStatus: mocks.updateCategoryStatus,
  deleteCategory: mocks.deleteCategory,
  uploadAdminImage: mocks.uploadAdminImage,
}));

describe("CategoriesPage form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCategories.mockResolvedValue({ items: [], total: 0 });
    mocks.createCategory.mockResolvedValue(undefined);
    mocks.updateCategory.mockResolvedValue(undefined);
    mocks.updateCategoryStatus.mockResolvedValue(undefined);
    mocks.deleteCategory.mockResolvedValue(undefined);
    mocks.uploadAdminImage.mockResolvedValue("https://example.com/plumbing.png");
  });

  it("shows validation errors for empty category form", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CategoriesPage />);

    await user.click(await screen.findByRole("button", { name: "+ Add Category" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Name should be at least 2 characters")).toBeInTheDocument();
    expect(await screen.findByText("Upload image is required")).toBeInTheDocument();
  });

  it("submits valid category form and calls createCategory API", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CategoriesPage />);

    await user.click(await screen.findByRole("button", { name: "+ Add Category" }));

    await user.type(screen.getByLabelText("Name"), "Plumbing");
    const file = new File(["icon"], "plumbing.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Icon Image"), file);
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mocks.createCategory).toHaveBeenCalled();
      expect(mocks.createCategory.mock.calls[0][0]).toEqual({
        name: "Plumbing",
        iconUrl: "https://example.com/plumbing.png",
        displayOrder: 1,
        active: true,
      });
    });
  });
});
