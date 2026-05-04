import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ServicesPage from "@/features/services/pages/ServicesPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getServices: vi.fn(),
  getServiceById: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  toggleServiceStatus: vi.fn(),
  deleteService: vi.fn(),
  uploadAdminImage: vi.fn(),
}));

vi.mock("@/services/lexhoAdminApi", () => ({
  getCategories: mocks.getCategories,
  getServices: mocks.getServices,
  getServiceById: mocks.getServiceById,
  createService: mocks.createService,
  updateService: mocks.updateService,
  toggleServiceStatus: mocks.toggleServiceStatus,
  deleteService: mocks.deleteService,
  uploadAdminImage: mocks.uploadAdminImage,
}));

describe("ServicesPage form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCategories.mockResolvedValue({
      items: [{ id: "cat-1", name: "Cleaning", iconUrl: "", active: true }],
      total: 1,
    });
    mocks.getServices.mockResolvedValue({
      items: [
        {
          id: "svc-0",
          name: "Sample",
          description: "Sample service description",
          price: 100,
          serviceType: "HOME_CLEANING",
          active: true,
          details: [],
        },
      ],
      total: 1,
    });
    mocks.createService.mockResolvedValue(undefined);
    mocks.updateService.mockResolvedValue(undefined);
    mocks.toggleServiceStatus.mockResolvedValue(undefined);
    mocks.deleteService.mockResolvedValue(undefined);
    mocks.uploadAdminImage.mockResolvedValue("https://example.com/service.jpg");
  });

  it("shows validation errors for empty service form", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ServicesPage />);

    await user.click(await screen.findByRole("button", { name: "Add Service" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(await screen.findByText("Description is required")).toBeInTheDocument();
    expect(await screen.findByText("Price must be positive")).toBeInTheDocument();
    expect(await screen.findByText("Service type is required")).toBeInTheDocument();
  });

  it("submits valid service form and calls createService API", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ServicesPage />);

    await user.click(await screen.findByRole("button", { name: "Add Service" }));

    await user.type(screen.getByLabelText("Name"), "Deep Cleaning");
    await user.type(screen.getByLabelText("Description"), "High quality deep cleaning service");
    await user.clear(screen.getByLabelText("Price"));
    await user.type(screen.getByLabelText("Price"), "1200");
    await user.type(screen.getByLabelText("Service Type"), "HOME_CLEANING");

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mocks.createService).toHaveBeenCalled();
      expect(mocks.createService.mock.calls[0][0]).toEqual({
        name: "Deep Cleaning",
        description: "High quality deep cleaning service",
        price: 1200,
        service_type: "HOME_CLEANING",
      });
    });
  });
});
