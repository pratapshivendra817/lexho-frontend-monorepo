import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  createCityMutate: vi.fn(),
  updateCityStatusMutate: vi.fn(),
  createAreaMutate: vi.fn(),
  reorderAreasMutate: vi.fn(),
  deleteCityMutate: vi.fn(),
  deleteAreaMutate: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/features/website-cities/hooks/useWebsiteCities", () => ({
  useWebsiteCitiesQuery: () => ({
    data: [
      { id: 7, name: "Mumbai", slug: "mumbai", displayOrder: 1, active: true },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCityAreasQuery: (cityId: number | null) => ({
    data:
      cityId == null
        ? undefined
        : [
            { id: 15, cityId, name: "Andheri", slug: "andheri", displayOrder: 1, active: true },
          ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useWebsiteCitiesMutations: () => ({
    createCityMutation: { isPending: false, mutate: mocks.createCityMutate },
    updateCityMutation: { isPending: false, mutate: vi.fn() },
    updateCityStatusMutation: { isPending: false, mutate: mocks.updateCityStatusMutate },
    deleteCityMutation: { isPending: false, mutate: mocks.deleteCityMutate },
    createAreaMutation: { isPending: false, mutate: mocks.createAreaMutate },
    updateAreaMutation: { isPending: false, mutate: vi.fn() },
    updateAreaStatusMutation: { isPending: false, mutate: vi.fn() },
    deleteAreaMutation: { isPending: false, mutate: mocks.deleteAreaMutate },
    reorderAreasMutation: { isPending: false, mutate: mocks.reorderAreasMutate },
  }),
}));

import WebsiteCitiesPage from "@/features/website-cities/pages/WebsiteCitiesPage";

describe("WebsiteCitiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a city with normalized slug", async () => {
    const user = userEvent.setup();

    render(<WebsiteCitiesPage />);

    await user.click(screen.getByRole("button", { name: "+ Create City" }));
    await user.type(screen.getByLabelText("Name"), "New Delhi");
    await user.click(screen.getByLabelText("Display Order"));
    await user.keyboard("{Control>}a{/Control}4");
    await user.click(screen.getByRole("button", { name: "Create City" }));

    expect(mocks.createCityMutate).toHaveBeenCalledWith(
      {
        name: "New Delhi",
        slug: "new-delhi",
        displayOrder: 4,
        active: true,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("does not submit a reorder request when a city has only one area", async () => {
    const user = userEvent.setup();

    render(<WebsiteCitiesPage />);

    await user.click(screen.getByRole("button", { name: "Manage Areas" }));
    expect(screen.getByText("Manage Areas: Mumbai")).toBeInTheDocument();
    expect(screen.getByText("Andheri")).toBeInTheDocument();

    const orderInput = screen.getAllByDisplayValue("1")[0];
    await user.click(orderInput);
    await user.keyboard("{Control>}a{/Control}3");
    await user.click(screen.getByRole("button", { name: "Save Order" }));

    expect(mocks.reorderAreasMutate).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Only one area is already in the correct order");
  });
});
