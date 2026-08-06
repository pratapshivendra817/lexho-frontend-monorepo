import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RecommendedAddonsPage from "@/features/recommended-addons/pages/RecommendedAddonsPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const apiMocks = vi.hoisted(() => ({
  getRecommendedAddons: vi.fn(),
  getAddonCategories: vi.fn(),
  getAddonServices: vi.fn(),
  createRecommendedAddon: vi.fn(),
  updateRecommendedAddon: vi.fn(),
  updateRecommendedAddonStatus: vi.fn(),
  deleteRecommendedAddon: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/features/recommended-addons/api/recommendedAddonsApi", () => ({
  getRecommendedAddons: apiMocks.getRecommendedAddons,
  getAddonCategories: apiMocks.getAddonCategories,
  getAddonServices: apiMocks.getAddonServices,
  createRecommendedAddon: apiMocks.createRecommendedAddon,
  updateRecommendedAddon: apiMocks.updateRecommendedAddon,
  updateRecommendedAddonStatus: apiMocks.updateRecommendedAddonStatus,
  deleteRecommendedAddon: apiMocks.deleteRecommendedAddon,
}));

vi.mock("react-hot-toast", () => ({
  default: toastMocks,
}));

describe("RecommendedAddonsPage form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getAddonCategories.mockResolvedValue([
      { id: "29", name: "Cook Services" },
      { id: "30", name: "Ghost Category" },
    ]);
    apiMocks.getAddonServices.mockResolvedValue([
      { id: "82", name: "Simple Veg Cook", categoryId: "29", categoryName: "Cook Services" },
      { id: "83", name: "Cook With Roti", categoryId: "29", categoryName: "Cook Services" },
    ]);
    apiMocks.getRecommendedAddons.mockResolvedValue([
      {
        id: "1",
        name: "Extra Roti",
        description: "Additional rotis with cook at home service.",
        price: 5,
        active: true,
        quantityAllowed: true,
        minQuantity: 1,
        maxQuantity: 20,
        required: false,
        categories: [
          { id: "29", name: "Cook Services" },
          { id: "30", name: "Category #30" },
        ],
        services: [
          { id: "82", name: "Simple Veg Cook", categoryId: "29", categoryName: "Cook Services" },
          { id: "83", name: "Cook With Roti", categoryId: "29", categoryName: "Cook Services" },
        ],
        servicesCount: 2,
        createdAt: "2026-07-11T10:11:17.461560Z",
      },
    ]);
    apiMocks.createRecommendedAddon.mockResolvedValue(undefined);
    apiMocks.updateRecommendedAddon.mockResolvedValue(undefined);
    apiMocks.updateRecommendedAddonStatus.mockResolvedValue(undefined);
    apiMocks.deleteRecommendedAddon.mockResolvedValue({ deleted: true, deactivated: false, data: {} });
  });

  it("filters stale category ids before updating an add-on", async () => {
    const user = userEvent.setup();

    renderWithProviders(<RecommendedAddonsPage />);

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(apiMocks.updateRecommendedAddon).toHaveBeenCalled();
    });

    expect(apiMocks.updateRecommendedAddon.mock.calls[0][0]).toBe("1");
    expect(apiMocks.updateRecommendedAddon.mock.calls[0][1]).toEqual({
      name: "Extra Roti",
      description: "Additional rotis with cook at home service.",
      price: 5,
      active: true,
      categoryIds: [29],
      serviceIds: [82, 83],
      quantityAllowed: true,
      minQuantity: 1,
      maxQuantity: 20,
      required: false,
    });
  });
});
