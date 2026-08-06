import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PopularServicesPage from "@/features/popular-services/pages/PopularServicesPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const apiMocks = vi.hoisted(() => ({
  createPopularService: vi.fn(),
  deletePopularService: vi.fn(),
  getCategoryOptions: vi.fn(),
  getDeletedPopularServicesByCategory: vi.fn(),
  getPopularServicesByCategory: vi.fn(),
  getServicesByCategory: vi.fn(),
  restorePopularService: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/features/popular-services/api/popularServicesApi", () => ({
  createPopularService: apiMocks.createPopularService,
  deletePopularService: apiMocks.deletePopularService,
  getCategoryOptions: apiMocks.getCategoryOptions,
  getDeletedPopularServicesByCategory: apiMocks.getDeletedPopularServicesByCategory,
  getPopularServicesByCategory: apiMocks.getPopularServicesByCategory,
  getServicesByCategory: apiMocks.getServicesByCategory,
  restorePopularService: apiMocks.restorePopularService,
}));

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

const baseCategories = [
  { id: "1", name: "Cleaning" },
  { id: "2", name: "Cooking" },
];

const baseServices = [
  { id: "11", name: "Deep Clean", imageUrl: "", price: 1200, rating: 4.3, categoryId: "1", categoryName: "Cleaning" },
  { id: "12", name: "Kitchen Clean", imageUrl: "", price: 1500, rating: 4.6, categoryId: "1", categoryName: "Cleaning" },
];

const basePopular = [
  { id: "p1", serviceId: "90", serviceName: "Popular Mop", categoryId: "1", priority: 1 },
];

const deletedPopular = [
  { id: "d1", serviceId: "77", serviceName: "Old Clean", categoryId: "1", priority: 2, deletedAt: "2026-01-01" },
];

describe("PopularServicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getCategoryOptions.mockResolvedValue(baseCategories);
    apiMocks.getServicesByCategory.mockResolvedValue(baseServices);
    apiMocks.getPopularServicesByCategory.mockResolvedValue(basePopular);
    apiMocks.getDeletedPopularServicesByCategory.mockResolvedValue(deletedPopular);
    apiMocks.createPopularService.mockResolvedValue(undefined);
    apiMocks.deletePopularService.mockResolvedValue(undefined);
    apiMocks.restorePopularService.mockResolvedValue(undefined);
  });

  it("shows category error state and retries loading", async () => {
    apiMocks.getCategoryOptions.mockRejectedValueOnce(new Error("nope")).mockResolvedValueOnce(baseCategories);

    renderWithProviders(<PopularServicesPage />);

    expect(await screen.findByText("Unable to load categories")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(apiMocks.getCategoryOptions).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Services (Cleaning)")).toBeInTheDocument();
  });

  it("shows the empty categories state when no categories are available", async () => {
    apiMocks.getCategoryOptions.mockResolvedValueOnce([]);

    renderWithProviders(<PopularServicesPage />);

    expect(await screen.findByText("No categories available")).toBeInTheDocument();
  });

  it("clears dependent lists when the category filter is reset", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findByText("Popular Mop")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Category Filter"), "");
    const refreshButtons = screen.getAllByRole("button", { name: "Refresh" });
    await user.click(refreshButtons[0]);
    await user.click(refreshButtons[1]);
    await user.click(refreshButtons[2]);

    expect(await screen.findByText("No services found for this category")).toBeInTheDocument();
    expect(await screen.findByText("No popular services configured for this category")).toBeInTheDocument();
    expect(await screen.findByText("No deleted popular services")).toBeInTheDocument();
  });

  it("handles service load errors, retries, refreshes, and category filter changes", async () => {
    const user = userEvent.setup();

    apiMocks.getServicesByCategory
      .mockRejectedValueOnce(new Error("service down"))
      .mockResolvedValue(baseServices);

    renderWithProviders(<PopularServicesPage />);

    expect(await screen.findByText("Unable to load services")).toBeInTheDocument();

    const servicesSection = screen.getByRole("heading", { name: "Services (Cleaning)" }).closest("section");
    expect(servicesSection).not.toBeNull();
    await user.click(within(servicesSection as HTMLElement).getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(apiMocks.getServicesByCategory).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Deep Clean")).toBeInTheDocument();

    await user.click(within(servicesSection as HTMLElement).getByRole("button", { name: "Refresh" }));
    await waitFor(() => {
      expect(apiMocks.getServicesByCategory).toHaveBeenCalledTimes(3);
    });

    await user.selectOptions(screen.getByLabelText("Category Filter"), "2");
    await waitFor(() => {
      expect(apiMocks.getServicesByCategory).toHaveBeenCalledWith("2");
    });
    expect(await screen.findByText("Services (Cooking)")).toBeInTheDocument();
  });

  it("handles popular-service loading errors and refreshes after retry", async () => {
    const user = userEvent.setup();

    apiMocks.getPopularServicesByCategory
      .mockRejectedValueOnce(new Error("popular down"))
      .mockResolvedValue(basePopular);

    renderWithProviders(<PopularServicesPage />);

    expect(await screen.findByText("Unable to load popular services")).toBeInTheDocument();

    const popularSection = screen.getByRole("heading", { name: "Popular Services" }).closest("section");
    expect(popularSection).not.toBeNull();
    await user.click(within(popularSection as HTMLElement).getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(apiMocks.getPopularServicesByCategory).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Popular Mop")).toBeInTheDocument();

    await user.click(within(popularSection as HTMLElement).getAllByRole("button", { name: "Refresh" })[0]);
    await waitFor(() => {
      expect(apiMocks.getPopularServicesByCategory).toHaveBeenCalledTimes(3);
    });
  });

  it("handles deleted popular-service errors, retries, refreshes, and cancel restore", async () => {
    const user = userEvent.setup();

    apiMocks.getDeletedPopularServicesByCategory
      .mockRejectedValueOnce(new Error("deleted down"))
      .mockResolvedValue(deletedPopular);

    renderWithProviders(<PopularServicesPage />);

    expect(await screen.findByText("Unable to load deleted popular services")).toBeInTheDocument();

    const deletedHeader = screen.getByRole("heading", { name: "Deleted Popular Services" });
    const deletedBlock = deletedHeader.parentElement?.parentElement;
    expect(deletedBlock).not.toBeNull();
    await user.click(within(deletedBlock as HTMLElement).getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(apiMocks.getDeletedPopularServicesByCategory).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Old Clean")).toBeInTheDocument();

    await user.click(within(deletedBlock as HTMLElement).getByRole("button", { name: "Refresh" }));
    await waitFor(() => {
      expect(apiMocks.getDeletedPopularServicesByCategory).toHaveBeenCalledTimes(3);
    });

    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("loads category data and creates a popular service with auto-adjusted priority", async () => {
    const user = userEvent.setup();
    apiMocks.getPopularServicesByCategory.mockResolvedValueOnce([
      { id: "p1", serviceId: "90", serviceName: "Popular Mop", categoryId: "1", priority: 1 },
      { id: "p2", serviceId: "91", serviceName: "Popular Dust", categoryId: "1", priority: 2 },
    ]);

    renderWithProviders(<PopularServicesPage />);

    expect(await screen.findByText("Services (Cleaning)")).toBeInTheDocument();
    expect(await screen.findByText("Deep Clean")).toBeInTheDocument();
    await user.click((await screen.findAllByRole("button", { name: "Make Popular" }))[0]);

    const dialog = await screen.findByRole("dialog", { name: "Make Popular: Deep Clean" });
    fireEvent.change(within(dialog).getByLabelText("Priority"), { target: { value: "1" } });
    await user.click(within(dialog).getByRole("button", { name: "Add Popular" }));

    await waitFor(() => {
      expect(apiMocks.createPopularService).toHaveBeenCalledWith({ serviceId: 11, categoryId: 1, priority: 3 });
    });
    expect(toastMock.success).toHaveBeenCalledWith("Service marked as popular");
    expect(toastMock.success).toHaveBeenCalledWith("Priority auto-adjusted to 3");
  });

  it("blocks duplicate make-popular attempts before saving", async () => {
    const user = userEvent.setup();

    apiMocks.getPopularServicesByCategory.mockResolvedValue([{ id: "p11", serviceId: "11", serviceName: "Deep Clean", categoryId: "1", priority: 1 }]);

    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findAllByText("Deep Clean")).toHaveLength(2);

    await user.click((await screen.findAllByRole("button", { name: "Make Popular" }))[0]);
    const dialog = await screen.findByRole("dialog", { name: "Make Popular: Deep Clean" });
    await user.click(within(dialog).getByRole("button", { name: "Add Popular" }));
    expect(toastMock.error).toHaveBeenCalledWith("This service is already marked as popular");
  });

  it("blocks invalid numeric ids before saving a popular service", async () => {
    const user = userEvent.setup();
    apiMocks.getServicesByCategory.mockResolvedValue([
      { id: "bad-id", name: "Broken", imageUrl: "", price: 100, rating: 4, categoryId: "1", categoryName: "Cleaning" },
    ]);

    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findByText("Broken")).toBeInTheDocument();
    await user.click((await screen.findAllByRole("button", { name: "Make Popular" }))[0]);
    const dialog = await screen.findByRole("dialog", { name: "Make Popular: Broken" });
    await user.click(within(dialog).getByRole("button", { name: "Add Popular" }));
    expect(toastMock.error).toHaveBeenCalledWith("Invalid service/category id");
  });

  it("validates category selection, mismatched categories, create failures, and modal close behavior", async () => {
    const user = userEvent.setup();

    apiMocks.getServicesByCategory.mockResolvedValue([
      { id: "11", name: "Deep Clean", imageUrl: "", price: 1200, rating: 4.3, categoryId: "2", categoryName: "Cleaning" },
    ]);

    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findByText("Deep Clean")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Make Popular" }));
    const dialog = await screen.findByRole("dialog", { name: "Make Popular: Deep Clean" });

    await user.selectOptions(within(dialog).getByLabelText("Category"), "");
    await user.click(within(dialog).getByRole("button", { name: "Add Popular" }));
    expect(toastMock.error).toHaveBeenCalledWith("Category is required");

    await user.selectOptions(within(dialog).getByLabelText("Category"), "1");
    await user.click(within(dialog).getByRole("button", { name: "Add Popular" }));
    expect(toastMock.error).toHaveBeenCalledWith("Selected service does not belong to the chosen category");

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Make Popular: Deep Clean" })).not.toBeInTheDocument();
    });

    apiMocks.getServicesByCategory.mockResolvedValue([
      { id: "22", name: "Categoryless", imageUrl: "", price: 500, rating: 4, categoryId: "", categoryName: "" },
    ]);
    apiMocks.createPopularService.mockRejectedValueOnce(new Error("save failed"));

    const servicesSection = screen.getByRole("heading", { name: "Services (Cleaning)" }).closest("section");
    expect(servicesSection).not.toBeNull();
    await user.click(within(servicesSection as HTMLElement).getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Categoryless")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Make Popular" }));
    const retryDialog = await screen.findByRole("dialog", { name: "Make Popular: Categoryless" });
    await user.click(within(retryDialog).getByRole("button", { name: "Add Popular" }));

    await waitFor(() => {
      expect(apiMocks.createPopularService).toHaveBeenCalledWith({ serviceId: 22, categoryId: 1, priority: 2 });
    });
    expect(toastMock.error).toHaveBeenCalledWith("Unable to add popular service");
  });

  it("switches to the submitted category when a service lacks a numeric category id", async () => {
    const user = userEvent.setup();

    apiMocks.getServicesByCategory.mockResolvedValue([
      { id: "33", name: "Loose Match", imageUrl: "", price: 900, rating: 4.1, categoryId: "", categoryName: "" },
    ]);

    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findByText("Loose Match")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Make Popular" }));
    const dialog = await screen.findByRole("dialog", { name: "Make Popular: Loose Match" });
    await user.selectOptions(within(dialog).getByLabelText("Category"), "2");
    await user.click(within(dialog).getByRole("button", { name: "Add Popular" }));

    await waitFor(() => {
      expect(apiMocks.createPopularService).toHaveBeenCalledWith({ serviceId: 33, categoryId: 2, priority: 2 });
      expect(apiMocks.getServicesByCategory).toHaveBeenCalledWith("2");
    });
  });

  it("removes and restores popular services, including restore fallback paths", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findByText("Popular Mop")).toBeInTheDocument();

    await user.click((await screen.findAllByRole("button", { name: "Remove" }))[0]);
    fireEvent.change(screen.getByPlaceholderText("Delete reason"), { target: { value: "cleanup" } });
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(apiMocks.deletePopularService).toHaveBeenCalledWith("p1", "cleanup");
    });
    expect(toastMock.success).toHaveBeenCalledWith("Popular service removed");

    await user.click((await screen.findAllByRole("button", { name: "Restore" }))[0]);
    fireEvent.change(screen.getByPlaceholderText("Priority"), { target: { value: "5" } });
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(apiMocks.restorePopularService).toHaveBeenCalledWith("d1", 5);
    });
    expect(toastMock.success).toHaveBeenCalledWith("Popular service restored");

    apiMocks.restorePopularService.mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: "inactive popular service not found" } } });
    apiMocks.createPopularService.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(apiMocks.createPopularService).toHaveBeenCalledWith({ serviceId: 77, categoryId: 1, priority: 2 });
    });
  });

  it("handles remove and restore failures after draft cancel flows", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findByText("Popular Mop")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("Delete reason")).not.toBeInTheDocument();

    apiMocks.deletePopularService.mockRejectedValueOnce(new Error("remove failed"));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to remove popular service");
    });
    await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(screen.queryByPlaceholderText("Delete reason")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("Priority")).not.toBeInTheDocument();

    apiMocks.restorePopularService.mockRejectedValueOnce(new Error("restore failed"));
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to restore popular service");
    });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("Priority")).not.toBeInTheDocument();

    apiMocks.restorePopularService.mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: "inactive popular service not found" } } });
    apiMocks.createPopularService.mockRejectedValueOnce(new Error("fallback failed"));
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to restore popular service");
    });
  });

  it("handles reorder success and failure for popular services", async () => {
    const user = userEvent.setup();

    apiMocks.getPopularServicesByCategory.mockResolvedValue([
      { id: "p1", serviceId: "11", serviceName: "Deep Clean", categoryId: "1", priority: 1 },
      { id: "p2", serviceId: "12", serviceName: "Kitchen Clean", categoryId: "1", priority: 2 },
    ]);
    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findAllByText("Deep Clean")).toHaveLength(2);

    const rows = await waitFor(() => {
      const matched = screen
        .getAllByRole("button", { name: "Remove" })
        .map((button) => button.closest("[draggable='true']") as HTMLElement);
      expect(matched).toHaveLength(2);
      return matched;
    });
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[1]);
    fireEvent.drop(rows[1]);
    await waitFor(() => {
      expect(apiMocks.deletePopularService).toHaveBeenCalledWith("p1");
      expect(apiMocks.createPopularService).toHaveBeenCalledWith({ serviceId: 12, categoryId: 1, priority: 1 });
    });
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith("Popular services reordered");
    });

    apiMocks.deletePopularService.mockRejectedValueOnce(new Error("no reorder"));
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[1]);
    fireEvent.drop(rows[1]);
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to persist reordered priorities");
    });
  });

  it("reports invalid ids when reordered popular services cannot be recreated safely", async () => {
    apiMocks.getPopularServicesByCategory.mockResolvedValue([
      { id: "p1", serviceId: "bad-id", serviceName: "Broken One", categoryId: "1", priority: 1 },
      { id: "p2", serviceId: "12", serviceName: "Kitchen Clean", categoryId: "1", priority: 2 },
    ]);

    renderWithProviders(<PopularServicesPage />);
    expect(await screen.findByText("Broken One")).toBeInTheDocument();

    const rows = await waitFor(() => {
      const matched = screen
        .getAllByRole("button", { name: "Remove" })
        .map((button) => button.closest("[draggable='true']") as HTMLElement);
      expect(matched).toHaveLength(2);
      return matched;
    });

    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[1]);
    fireEvent.drop(rows[1]);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to persist reordered priorities");
    });
  });

  it("renders debug helpers when the debug env flag is enabled", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_POPULAR_SERVICES_DEBUG", "true");

    const imported = await import("@/features/popular-services/pages/PopularServicesPage");
    renderWithProviders(<imported.default />);

    expect(await screen.findByText("Debug")).toBeInTheDocument();
    expect(await screen.findByText(/selectedCategoryId:/)).toBeInTheDocument();

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
