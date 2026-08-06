import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CleaningCoveragePage from "@/features/cleaning-coverage/pages/CleaningCoveragePage";
import { renderWithProviders } from "../utils/renderWithProviders";

const apiMocks = vi.hoisted(() => ({
  getAdminCleaningCoverage: vi.fn(),
  createAdminCleaningCoverage: vi.fn(),
  updateAdminCleaningCoverage: vi.fn(),
  deleteAdminCleaningCoverage: vi.fn(),
  getAdminCookCoverage: vi.fn(),
  createAdminCookCoverage: vi.fn(),
  updateAdminCookCoverage: vi.fn(),
  deleteAdminCookCoverage: vi.fn(),
}));

const pricingMocks = vi.hoisted(() => ({
  getAdminSubscriptionPricing: vi.fn(),
  createAdminSubscriptionPricing: vi.fn(),
  updateAdminSubscriptionPricing: vi.fn(),
  deleteAdminSubscriptionPricing: vi.fn(),
  getAdminCookSubscriptionPricing: vi.fn(),
  createAdminCookSubscriptionPricing: vi.fn(),
  updateAdminCookSubscriptionPricing: vi.fn(),
  deleteAdminCookSubscriptionPricing: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  getServices: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/features/cleaning-coverage/api/cleaningCoverageApi", () => ({
  getAdminCleaningCoverage: apiMocks.getAdminCleaningCoverage,
  createAdminCleaningCoverage: apiMocks.createAdminCleaningCoverage,
  updateAdminCleaningCoverage: apiMocks.updateAdminCleaningCoverage,
  deleteAdminCleaningCoverage: apiMocks.deleteAdminCleaningCoverage,
  getAdminCookCoverage: apiMocks.getAdminCookCoverage,
  createAdminCookCoverage: apiMocks.createAdminCookCoverage,
  updateAdminCookCoverage: apiMocks.updateAdminCookCoverage,
  deleteAdminCookCoverage: apiMocks.deleteAdminCookCoverage,
}));

vi.mock("@/features/subscriptions/api/subscriptionPricingApi", () => ({
  getAdminSubscriptionPricing: pricingMocks.getAdminSubscriptionPricing,
  createAdminSubscriptionPricing: pricingMocks.createAdminSubscriptionPricing,
  updateAdminSubscriptionPricing: pricingMocks.updateAdminSubscriptionPricing,
  deleteAdminSubscriptionPricing: pricingMocks.deleteAdminSubscriptionPricing,
  getAdminCookSubscriptionPricing: pricingMocks.getAdminCookSubscriptionPricing,
  createAdminCookSubscriptionPricing: pricingMocks.createAdminCookSubscriptionPricing,
  updateAdminCookSubscriptionPricing: pricingMocks.updateAdminCookSubscriptionPricing,
  deleteAdminCookSubscriptionPricing: pricingMocks.deleteAdminCookSubscriptionPricing,
}));

vi.mock("@/services/lexhoAdminApi", () => ({
  getServices: serviceMocks.getServices,
}));

vi.mock("react-hot-toast", () => ({
  default: toastMocks,
}));

const cleaningCoverageRow = {
  id: 101,
  durationHours: 2,
  reference: "2BHK",
  sortOrder: 200,
  active: true,
  tasks: [{ id: 11, name: "Bathroom", icon: "bathroom", estimatedMinutes: 20, sortOrder: 1 }],
};

const cookCoverageRow = {
  id: 201,
  serviceId: 5,
  familySize: "MEDIUM" as const,
  members: "3-4",
  familySizeLabel: "3-4 Members",
  reference: "Standard home cooking",
  sortOrder: 20,
  active: true,
  items: [{ id: 21, name: "Roti", icon: "roti", sortOrder: 1, quantity: 8 }],
};

const cleaningPriceRow = {
  id: 301,
  serviceId: null,
  durationHours: 2,
  perVisitPrice: 220,
  active: true,
};

const cookPriceRow = {
  id: 401,
  serviceId: 5,
  familySize: "MEDIUM" as const,
  familySizeLabel: "3-4 Members",
  pricePerVisit: 420,
  active: true,
};

function seedCoverageData() {
  apiMocks.getAdminCleaningCoverage.mockResolvedValue([cleaningCoverageRow]);
  apiMocks.getAdminCookCoverage.mockResolvedValue([cookCoverageRow]);
  pricingMocks.getAdminSubscriptionPricing.mockResolvedValue([cleaningPriceRow]);
  pricingMocks.getAdminCookSubscriptionPricing.mockResolvedValue([cookPriceRow]);
}

describe("CleaningCoveragePage cook coverage form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getAdminCleaningCoverage.mockResolvedValue([]);
    apiMocks.createAdminCleaningCoverage.mockResolvedValue(undefined);
    apiMocks.updateAdminCleaningCoverage.mockResolvedValue(undefined);
    apiMocks.deleteAdminCleaningCoverage.mockResolvedValue(undefined);
    apiMocks.getAdminCookCoverage.mockResolvedValue([]);
    apiMocks.createAdminCookCoverage.mockResolvedValue(undefined);
    apiMocks.updateAdminCookCoverage.mockResolvedValue(undefined);
    apiMocks.deleteAdminCookCoverage.mockResolvedValue(undefined);
    pricingMocks.getAdminSubscriptionPricing.mockResolvedValue([]);
    pricingMocks.createAdminSubscriptionPricing.mockResolvedValue(undefined);
    pricingMocks.updateAdminSubscriptionPricing.mockResolvedValue(undefined);
    pricingMocks.deleteAdminSubscriptionPricing.mockResolvedValue(undefined);
    pricingMocks.getAdminCookSubscriptionPricing.mockResolvedValue([]);
    pricingMocks.createAdminCookSubscriptionPricing.mockResolvedValue(undefined);
    pricingMocks.updateAdminCookSubscriptionPricing.mockResolvedValue(undefined);
    pricingMocks.deleteAdminCookSubscriptionPricing.mockResolvedValue(undefined);
    serviceMocks.getServices.mockResolvedValue({
      items: [
        { id: "5", name: "Simple Veg Cook", categoryName: "Food Service", serviceType: "COOK_AT_HOME" },
        { id: "6", name: "Healthy Breakfast", categoryName: "Breakfast At Home", serviceType: "BREAKFAST_AT_HOME" },
      ],
      total: 2,
    });
  });

  it("requires roti quantity and submits quantity-aware payloads", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CleaningCoveragePage />);

    await user.click(await screen.findByRole("button", { name: "Cook Coverage" }));
    await user.click(screen.getByRole("button", { name: "+ Add Cook Coverage" }));

    await user.selectOptions(screen.getByLabelText("Service"), "5");
    await user.clear(screen.getByLabelText("Item Name"));
    await user.type(screen.getByLabelText("Item Name"), "Roti");
    await user.selectOptions(screen.getByLabelText("Icon"), "roti");
    await user.clear(screen.getByLabelText("Quantity (Required)"));
    await user.type(screen.getByLabelText("Quantity (Required)"), "0");

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(toastMocks.error).toHaveBeenCalledWith("Roti quantity is required");
    expect(apiMocks.createAdminCookCoverage).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Quantity (Required)"));
    await user.type(screen.getByLabelText("Quantity (Required)"), "10");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(apiMocks.createAdminCookCoverage).toHaveBeenCalled();
    });

    expect(apiMocks.createAdminCookCoverage.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        serviceId: 5,
        familySize: "MEDIUM",
        members: "3-4",
        familySizeLabel: "3-4 Members",
        items: [
          expect.objectContaining({
            name: "Roti",
            icon: "roti",
            quantity: 10,
          }),
        ],
      }),
    );
  }, 10000);

  it("does not require roti for breakfast coverage services", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CleaningCoveragePage />);

    await user.click(await screen.findByRole("button", { name: "Cook Coverage" }));
    await user.click(screen.getByRole("button", { name: "+ Add Cook Coverage" }));

    await user.selectOptions(screen.getByLabelText("Service"), "6");

    expect(screen.getByDisplayValue("Standard breakfast coverage")).toBeInTheDocument();
    expect(screen.getByText("These breakfast items are saved separately for each family size. Add quantity for every item.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Item Name"));
    await user.type(screen.getByLabelText("Item Name"), "Poha");
    await user.selectOptions(screen.getByLabelText("Icon"), "poha");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "2");

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(apiMocks.createAdminCookCoverage).toHaveBeenCalled();
    });

    expect(apiMocks.createAdminCookCoverage.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        serviceId: 6,
        reference: "Standard breakfast coverage",
        items: [
          expect.objectContaining({
            name: "Poha",
            icon: "poha",
            quantity: 2,
          }),
        ],
      }),
    );
    expect(toastMocks.error).not.toHaveBeenCalledWith("Roti quantity is required");
  });

  it("shows Cook At Home services in the cook coverage service dropdown even when the service name lacks cook keywords", async () => {
    const user = userEvent.setup();
    serviceMocks.getServices.mockResolvedValue({
      items: [
        { id: "9", name: "North Indian", categoryName: "Cook At Home", serviceType: "COOK_AT_HOME" },
        { id: "10", name: "Power Cleaning", categoryName: "Cleaning", serviceType: "HOME_CLEANING" },
      ],
      total: 2,
    });

    renderWithProviders(<CleaningCoveragePage />);

    await user.click(await screen.findByRole("button", { name: "Cook Coverage" }));
    await user.click(screen.getByRole("button", { name: "+ Add Cook Coverage" }));

    const serviceSelect = screen.getByLabelText("Service");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "North Indian (Cook At Home)" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("option", { name: "Power Cleaning (Cleaning)" })).not.toBeInTheDocument();

    await user.selectOptions(serviceSelect, "9");
    expect(screen.getByDisplayValue("Standard home cooking")).toBeInTheDocument();
  });

  it("blocks duplicate cook coverage creation for the same service and family size", async () => {
    const user = userEvent.setup();
    apiMocks.getAdminCookCoverage.mockResolvedValue([
      {
        id: 41,
        serviceId: 5,
        familySize: "SMALL",
        members: "1-2",
        familySizeLabel: "1-2 Members",
        reference: "Standard home cooking",
        sortOrder: 20,
        active: true,
        items: [{ id: 1, name: "Dal", icon: "dal", sortOrder: 1, quantity: 1 }],
      },
    ]);

    renderWithProviders(<CleaningCoveragePage />);

    await user.click(await screen.findByRole("button", { name: "Cook Coverage" }));
    await user.click(screen.getByRole("button", { name: "+ Add Cook Coverage" }));

    await user.selectOptions(screen.getByLabelText("Service"), "5");
    await user.selectOptions(screen.getByLabelText("Family Size"), "SMALL");
    await user.clear(screen.getByLabelText("Item Name"));
    await user.type(screen.getByLabelText("Item Name"), "Roti");
    await user.selectOptions(screen.getByLabelText("Icon"), "roti");
    await user.clear(screen.getByLabelText("Quantity (Required)"));
    await user.type(screen.getByLabelText("Quantity (Required)"), "8");

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Cook coverage already exists for this service and family size. Please edit the existing record.",
    );
    expect(apiMocks.createAdminCookCoverage).not.toHaveBeenCalled();
  });

  it("blocks cleaning prices that do not increase with duration", async () => {
    const user = userEvent.setup();
    pricingMocks.getAdminSubscriptionPricing.mockResolvedValue([
      { id: 11, serviceId: null, durationHours: 2, perVisitPrice: 200, active: true },
      { id: 12, serviceId: null, durationHours: 4, perVisitPrice: 400, active: true },
    ]);

    renderWithProviders(<CleaningCoveragePage />);

    await user.click(await screen.findByRole("button", { name: "+ Add Price" }));

    await user.clear(screen.getByLabelText("Duration Hours"));
    await user.type(screen.getByLabelText("Duration Hours"), "3");
    await user.type(screen.getByLabelText("Per Visit Price"), "150");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(toastMocks.error).toHaveBeenCalledWith("Price must be greater than Rs. 200 because 3 hr is longer than 2 hr");
    expect(pricingMocks.createAdminSubscriptionPricing).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Per Visit Price"));
    await user.type(screen.getByLabelText("Per Visit Price"), "300");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(pricingMocks.createAdminSubscriptionPricing).toHaveBeenCalled();
    });

    expect(pricingMocks.createAdminSubscriptionPricing.mock.calls[0][0]).toEqual({
      serviceId: null,
      durationHours: 3,
      perVisitPrice: 300,
      active: true,
    });
  });

  it("updates, deactivates, deletes, and validates cleaning coverage plus cleaning prices", async () => {
    const user = userEvent.setup();
    seedCoverageData();

    renderWithProviders(<CleaningCoveragePage />);

    await screen.findByText(/Bathroom/);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    await user.clear(screen.getByLabelText("Reference"));
    await user.type(screen.getByLabelText("Reference"), "3BHK Deluxe");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(apiMocks.updateAdminCleaningCoverage).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          durationHours: 2,
          reference: "3BHK Deluxe",
          active: true,
          tasks: [expect.objectContaining({ name: "Bathroom", icon: "bathroom", estimatedMinutes: 20 })],
        }),
      );
    });

    await user.click(screen.getAllByRole("button", { name: "Deactivate" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Deactivate" }).at(-1)!);
    await waitFor(() => {
      expect(apiMocks.updateAdminCleaningCoverage).toHaveBeenLastCalledWith(
        101,
        expect.objectContaining({ active: false }),
      );
    });

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]!);
    await user.clear(screen.getByLabelText("Per Visit Price"));
    await user.type(screen.getByLabelText("Per Visit Price"), "275");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(pricingMocks.updateAdminSubscriptionPricing).toHaveBeenCalledWith(301, {
        serviceId: null,
        durationHours: 2,
        perVisitPrice: 275,
        active: true,
      });
    });

    await user.click(screen.getAllByRole("button", { name: "Delete" })[1]!);
    await user.click(screen.getAllByRole("button", { name: "Deactivate" }).at(-1)!);
    await waitFor(() => {
      expect(pricingMocks.deleteAdminSubscriptionPricing.mock.calls.at(-1)?.[0]).toBe(301);
    });

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    await waitFor(() => {
      expect(apiMocks.deleteAdminCleaningCoverage.mock.calls.at(-1)?.[0]).toBe(101);
    });

    await user.click(screen.getByRole("button", { name: "+ Add Cleaning Coverage" }));
    await user.clear(screen.getByLabelText("Duration Hours"));
    await user.type(screen.getByLabelText("Duration Hours"), "0");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(toastMocks.error).toHaveBeenCalledWith("Duration is required");
    expect(apiMocks.createAdminCleaningCoverage).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
  }, 10000);

  it("preserves custom cook reference and supports cook coverage edit, deactivate, and delete", async () => {
    const user = userEvent.setup();
    seedCoverageData();

    renderWithProviders(<CleaningCoveragePage />);

    await user.click(await screen.findByRole("button", { name: "Cook Coverage" }));
    await screen.findByText("Simple Veg Cook");

    await user.click(screen.getByRole("button", { name: "+ Add Cook Coverage" }));
    await user.clear(screen.getByLabelText("Reference"));
    await user.type(screen.getByLabelText("Reference"), "Family dinner");
    await user.selectOptions(screen.getByLabelText("Service"), "6");
    expect(screen.getByDisplayValue("Family dinner")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    await user.clear(screen.getByLabelText("Quantity (Required)"));
    await user.type(screen.getByLabelText("Quantity (Required)"), "12");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(apiMocks.updateAdminCookCoverage).toHaveBeenCalledWith(
        201,
        expect.objectContaining({
          serviceId: 5,
          familySize: "MEDIUM",
          items: [expect.objectContaining({ name: "Roti", quantity: 12 })],
        }),
      );
    });

    await user.click(screen.getAllByRole("button", { name: "Deactivate" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Deactivate" }).at(-1)!);
    await waitFor(() => {
      expect(apiMocks.updateAdminCookCoverage).toHaveBeenLastCalledWith(
        201,
        expect.objectContaining({ active: false }),
      );
    });

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    await waitFor(() => {
      expect(apiMocks.deleteAdminCookCoverage.mock.calls.at(-1)?.[0]).toBe(201);
    });
  }, 10000);

  it("validates, creates, updates, and deactivates cook subscription pricing", async () => {
    const user = userEvent.setup();
    seedCoverageData();

    renderWithProviders(<CleaningCoveragePage />);

    await user.click(await screen.findByRole("button", { name: "Cook Coverage" }));

    await user.click(screen.getByRole("button", { name: "+ Add Cook Price" }));
    await user.clear(screen.getByLabelText("Service ID"));
    await user.type(screen.getByLabelText("Service ID"), "abc12");
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Family Size"), "LARGE");
    await user.clear(screen.getByLabelText("Per Visit Price"));
    await user.type(screen.getByLabelText("Per Visit Price"), "0");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(toastMocks.error).toHaveBeenCalledWith("Per visit price is required");
    expect(pricingMocks.createAdminCookSubscriptionPricing).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Per Visit Price"));
    await user.type(screen.getByLabelText("Per Visit Price"), "510");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(pricingMocks.createAdminCookSubscriptionPricing.mock.calls[0]?.[0]).toEqual({
        serviceId: 12,
        familySize: "LARGE",
        pricePerVisit: 510,
        active: true,
      });
    });

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]!);
    await user.selectOptions(screen.getByLabelText("Family Size"), "XLARGE");
    await user.clear(screen.getByLabelText("Per Visit Price"));
    await user.type(screen.getByLabelText("Per Visit Price"), "575");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(pricingMocks.updateAdminCookSubscriptionPricing).toHaveBeenCalledWith(401, {
        serviceId: 5,
        familySize: "XLARGE",
        pricePerVisit: 575,
        active: true,
      });
    });

    await user.click(screen.getAllByRole("button", { name: "Delete" })[1]!);
    await user.click(screen.getAllByRole("button", { name: "Deactivate" }).at(-1)!);
    await waitFor(() => {
      expect(pricingMocks.deleteAdminCookSubscriptionPricing.mock.calls.at(-1)?.[0]).toBe(401);
    });
  }, 10000);
});
