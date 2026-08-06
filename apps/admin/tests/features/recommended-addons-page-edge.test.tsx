import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

function seedQueries() {
  apiMocks.getAddonCategories.mockResolvedValue([
    { id: "29", name: "Cook Services" },
    { id: "31", name: "Cleaning" },
  ]);
  apiMocks.getAddonServices.mockResolvedValue([
    { id: "82", name: "Simple Veg Cook", categoryId: "29", categoryName: "Cook Services" },
    { id: "91", name: "Deep Cleaning", categoryId: "31", categoryName: "Cleaning" },
  ]);
  apiMocks.getRecommendedAddons.mockResolvedValue([
    {
      id: "1",
      name: "Extra Roti",
      description: "Additional rotis",
      price: 5,
      active: true,
      quantityAllowed: true,
      minQuantity: 1,
      maxQuantity: 20,
      required: false,
      categories: [{ id: "29", name: "Cook Services" }],
      services: [{ id: "82", name: "Simple Veg Cook", categoryId: "29", categoryName: "Cook Services" }],
      servicesCount: 2,
      createdAt: "2026-07-11T10:11:17.461560Z",
    },
    {
      id: "2",
      name: "Mandatory Kit",
      description: "",
      price: 12,
      active: false,
      quantityAllowed: false,
      minQuantity: 1,
      maxQuantity: 1,
      required: true,
      categories: [],
      services: [],
      servicesCount: 0,
      createdAt: "not-a-date",
    },
  ]);
  apiMocks.createRecommendedAddon.mockResolvedValue(undefined);
  apiMocks.updateRecommendedAddon.mockResolvedValue(undefined);
  apiMocks.updateRecommendedAddonStatus.mockResolvedValue(undefined);
  apiMocks.deleteRecommendedAddon.mockResolvedValue({ deleted: true, deactivated: false, data: {} });
}

function getAddonRow(name: string) {
  return screen.getByRole("row", { name: new RegExp(name, "i") });
}

function changeInput(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

describe("RecommendedAddonsPage edge coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedQueries();
  });

  it("renders rows, filters, toggles status, edits and deletes addons", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecommendedAddonsPage />);

    expect(await screen.findByText("Extra Roti")).toBeInTheDocument();
    expect(screen.getByText("Rs. 5")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("not-a-date")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search by add-on name"), "kit");
    await user.selectOptions(screen.getByDisplayValue("All statuses"), "INACTIVE");
    await user.selectOptions(screen.getByDisplayValue("All categories"), "31");
    await user.selectOptions(screen.getByDisplayValue("All services"), "91");
    await waitFor(() =>
      expect(apiMocks.getRecommendedAddons).toHaveBeenLastCalledWith({
        search: "kit",
        status: "INACTIVE",
        categoryId: "31",
        serviceId: "91",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Active" }));
    await waitFor(() => expect(apiMocks.updateRecommendedAddonStatus).toHaveBeenCalledWith("1", false));

    await user.click(within(getAddonRow("Extra Roti")).getByRole("button", { name: "Edit" }));
    const editDialog = await screen.findByRole("dialog", { name: "Edit Add-on" });
    await user.click(within(editDialog).getByRole("button", { name: "Update" }));
    await waitFor(() => expect(apiMocks.updateRecommendedAddon).toHaveBeenCalled());

    await user.click(within(getAddonRow("Extra Roti")).getByRole("button", { name: "Delete" }));
    expect(screen.getByText(/delete Extra Roti/i)).toBeInTheDocument();
    const deleteDialog = await screen.findByRole("dialog", { name: "Delete Add-on" });
    await user.click(within(deleteDialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(apiMocks.deleteRecommendedAddon).toHaveBeenCalled());
    expect(apiMocks.deleteRecommendedAddon.mock.calls.at(-1)?.[0]).toBe("1");
    expect(toastMocks.success).toHaveBeenCalledWith("Add-on deleted");
  });

  it("validates create flow and submits required quantity-enabled addon payload", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecommendedAddonsPage />);

    await user.click(screen.getByRole("button", { name: "Create Add-on" }));
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(toastMocks.error).toHaveBeenCalledWith("Add-on name is required");

    changeInput(screen.getByLabelText("Add-on Name *"), "Chef Kit");
    changeInput(screen.getByLabelText("Price *"), "25");
    await user.click(screen.getByLabelText("Quantity Allowed?"));
    changeInput(screen.getByLabelText("Minimum Quantity"), "3");
    changeInput(screen.getByLabelText("Maximum Quantity"), "2");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(toastMocks.error).toHaveBeenCalledWith("Select at least one category or service");

    const createDialog = await screen.findByRole("dialog", { name: "Create Add-on" });
    await user.click(within(createDialog).getByLabelText("Cook Services"));
    await user.click(within(createDialog).getByLabelText(/Simple Veg Cook/i));
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(toastMocks.error).toHaveBeenCalledWith("Maximum quantity must be greater than or equal to minimum quantity");

    changeInput(screen.getByLabelText("Maximum Quantity"), "4");
    await user.selectOptions(screen.getByDisplayValue("Optional"), "REQUIRED");
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    expect(screen.getByText("Rs. 75")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(apiMocks.createRecommendedAddon).toHaveBeenCalled());
    expect(apiMocks.createRecommendedAddon.mock.calls.at(-1)?.[0]).toEqual({
      name: "Chef Kit",
      description: undefined,
      price: 25,
      active: true,
      categoryIds: [29],
      serviceIds: [82],
      quantityAllowed: true,
      minQuantity: 3,
      maxQuantity: 4,
      required: true,
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Add-on created");
  });

  it("renders loading, error and empty states", async () => {
    apiMocks.getRecommendedAddons.mockImplementationOnce(() => new Promise(() => {}));
    renderWithProviders(<RecommendedAddonsPage />);
    expect(screen.getByText("Loading add-ons...")).toBeInTheDocument();

    apiMocks.getRecommendedAddons.mockRejectedValueOnce(new Error("broken"));
    renderWithProviders(<RecommendedAddonsPage />);
    expect(await screen.findByText("Failed to load add-ons")).toBeInTheDocument();

    apiMocks.getRecommendedAddons.mockResolvedValueOnce([]);
    renderWithProviders(<RecommendedAddonsPage />);
    expect(await screen.findByText("No add-ons found")).toBeInTheDocument();
  });

  it("shows selector loading and empty states with default preview fallback", async () => {
    const user = userEvent.setup();
    apiMocks.getAddonCategories.mockImplementationOnce(() => new Promise(() => {}));
    apiMocks.getAddonServices.mockResolvedValueOnce([]);

    renderWithProviders(<RecommendedAddonsPage />);
    expect(await screen.findByText("Extra Roti")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Add-on" }));
    const dialog = await screen.findByRole("dialog", { name: "Create Add-on" });

    expect(within(dialog).getByText("Home Cleaning")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Loading...").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("No options available")).toBeInTheDocument();

    await user.click(within(dialog).getByLabelText("Quantity Allowed?"));
    expect(within(dialog).getByLabelText("Minimum Quantity")).toHaveValue(1);
    expect(within(dialog).getByLabelText("Maximum Quantity")).toHaveValue(1);
    await user.click(within(dialog).getByLabelText("Quantity Allowed?"));
    expect(within(dialog).queryByLabelText("Minimum Quantity")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Maximum Quantity")).not.toBeInTheDocument();
  });

  it("surfaces create, update, status and delete mutation errors", async () => {
    const user = userEvent.setup();
    apiMocks.createRecommendedAddon.mockRejectedValueOnce(new Error("create failed"));
    apiMocks.updateRecommendedAddon.mockRejectedValueOnce(new Error("update failed"));
    apiMocks.updateRecommendedAddonStatus.mockRejectedValueOnce(new Error("status failed"));
    apiMocks.deleteRecommendedAddon.mockRejectedValueOnce(new Error("delete failed"));

    renderWithProviders(<RecommendedAddonsPage />);
    expect(await screen.findByText("Extra Roti")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Active" }));
    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Unable to update status"));

    await user.click(screen.getByRole("button", { name: "Create Add-on" }));
    await user.type(screen.getByLabelText("Add-on Name *"), "Sauce");
    await user.type(screen.getByLabelText("Price *"), "10");
    const createDialog = await screen.findByRole("dialog", { name: "Create Add-on" });
    await user.click(within(createDialog).getByLabelText("Cook Services"));
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Unable to create add-on"));

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(within(getAddonRow("Extra Roti")).getByRole("button", { name: "Edit" }));
    const editDialog = await screen.findByRole("dialog", { name: "Edit Add-on" });
    await user.click(within(editDialog).getByRole("button", { name: "Update" }));
    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Unable to update add-on"));
    await user.click(within(editDialog).getByRole("button", { name: "Cancel" }));

    await user.click(within(getAddonRow("Extra Roti")).getByRole("button", { name: "Delete" }));
    const deleteDialog = await screen.findByRole("dialog", { name: "Delete Add-on" });
    await user.click(within(deleteDialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Unable to delete add-on"));
  });
});
