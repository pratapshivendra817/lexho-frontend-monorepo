import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ServicesPage from "@/features/services/pages/ServicesPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const apiMocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getServices: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  toggleServiceStatus: vi.fn(),
  deleteService: vi.fn(),
  uploadAdminImage: vi.fn(),
}));

const popularMocks = vi.hoisted(() => ({
  getCategoryOptions: vi.fn(),
  getPopularServicesByCategory: vi.fn(),
  createPopularService: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

const toastMock = vi.hoisted(() => {
  const fn = vi.fn();
  return Object.assign(fn, {
    success: vi.fn(),
    error: vi.fn(),
  });
});

vi.mock("@/services/lexhoAdminApi", () => ({
  getCategories: apiMocks.getCategories,
  getServices: apiMocks.getServices,
  createService: apiMocks.createService,
  updateService: apiMocks.updateService,
  toggleServiceStatus: apiMocks.toggleServiceStatus,
  deleteService: apiMocks.deleteService,
  uploadAdminImage: apiMocks.uploadAdminImage,
}));

vi.mock("@/features/popular-services/api/popularServicesApi", () => ({
  getCategoryOptions: popularMocks.getCategoryOptions,
  getPopularServicesByCategory: popularMocks.getPopularServicesByCategory,
  createPopularService: popularMocks.createPopularService,
}));

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/features/popular-services/pages/PopularServicesPage", () => ({
  default: () => <div>Mock Popular Services Page</div>,
}));

const baseService = {
  id: "svc-1",
  name: "Deep Cleaning",
  description: "High quality deep cleaning service",
  price: 1200,
  rating: 4.4,
  categoryId: 1,
  serviceType: "HOME_CLEANING",
  imageUrl: "https://example.com/service.jpg",
  active: true,
  details: [],
};

function renderPage() {
  return renderWithProviders(<ServicesPage />);
}

async function openCreateModal() {
  await userEvent.setup().click(await screen.findByRole("button", { name: "Add Service" }));
}

async function fillCreateForm() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Kitchen Cleaning" } });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Detailed kitchen cleaning service" } });
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "1500" } });
  fireEvent.change(screen.getByLabelText("Rating (0 to 5)"), { target: { value: "4.5" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Service Type"), { target: { value: "KITCHEN_CLEANING" } });
}

describe("ServicesPage interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getCategories.mockResolvedValue({
      items: [{ id: 1, name: "Cleaning", iconUrl: "", active: true }],
      total: 1,
    });
    popularMocks.getCategoryOptions.mockResolvedValue([{ id: 9, name: "Featured" }]);
    popularMocks.getPopularServicesByCategory.mockResolvedValue([]);
    popularMocks.createPopularService.mockResolvedValue(undefined);
    apiMocks.getServices.mockResolvedValue({
      items: [baseService, { ...baseService, id: "svc-2", name: "Cook Assist", active: false, serviceType: "" }],
      total: 21,
    });
    apiMocks.createService.mockResolvedValue({ id: 44 });
    apiMocks.updateService.mockResolvedValue(undefined);
    apiMocks.toggleServiceStatus.mockResolvedValue(undefined);
    apiMocks.deleteService.mockResolvedValue(undefined);
    apiMocks.uploadAdminImage.mockResolvedValue("https://example.com/uploaded.jpg");
  });

  it("shows loading state while services are being fetched", () => {
    apiMocks.getServices.mockReturnValueOnce(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText("Loading services...")).toBeInTheDocument();
  });

  it("shows empty and error states and retries failed loading", async () => {
    apiMocks.getServices.mockResolvedValueOnce({ items: [], total: 0 });
    renderPage();
    expect(await screen.findByText("No services found")).toBeInTheDocument();

    apiMocks.getServices.mockReset();
    apiMocks.getServices.mockRejectedValueOnce(new Error("network failed")).mockResolvedValueOnce({ items: [baseService], total: 1 });

    renderPage();
    expect(await screen.findByText("Failed to load services")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(apiMocks.getServices).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByRole("button", { name: "Deep Cleaning" })).toBeInTheDocument();
  });

  it("supports search, status, sort, clear, pagination, detail navigation, and status toggling", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search services"), { target: { value: "cook" } });
    await waitFor(() => {
      expect(apiMocks.getServices).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: "cook" }));
    });

    fireEvent.change(screen.getByDisplayValue("All status"), { target: { value: "inactive" } });
    await waitFor(() => {
      expect(apiMocks.getServices).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: "inactive" }));
    });

    fireEvent.change(screen.getByDisplayValue("Default sort"), { target: { value: "createdAt,asc" } });
    await waitFor(() => {
      expect(apiMocks.getServices).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, sort: "createdAt,asc" }));
    });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(apiMocks.getServices).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    });

    await user.click(screen.getByRole("button", { name: "Deep Cleaning" }));
    expect(navigateMock).toHaveBeenCalledWith("/services/svc-1");

    await user.click(screen.getByRole("button", { name: "Active" }));
    await waitFor(() => {
      expect(apiMocks.toggleServiceStatus).toHaveBeenCalledWith("svc-1");
    });
    expect(toastMock.success).toHaveBeenCalledWith("Service status updated");

    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => {
      expect(apiMocks.getServices).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        status: undefined,
        sort: undefined,
      });
    });
  });

  it("switches to popular services mode", async () => {
    renderPage();

    await userEvent.setup().click(await screen.findByRole("button", { name: "Popular Services" }));

    expect(await screen.findByText("Mock Popular Services Page")).toBeInTheDocument();
    expect(screen.queryByText("Service Management")).not.toBeInTheDocument();
  });

  it("uploads service images, previews them, and reports upload failures", async () => {
    const user = userEvent.setup();
    const pendingUpload = new Promise<string>(() => undefined);
    apiMocks.uploadAdminImage
      .mockReturnValueOnce(pendingUpload)
      .mockRejectedValueOnce(new Error("upload failed"))
      .mockResolvedValueOnce("https://example.com/uploaded-success.jpg");

    renderPage();
    await user.click(await screen.findByRole("button", { name: "Add Service" }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput, { target: { files: [new File(["img"], "service.png", { type: "image/png" })] } });
    expect(await screen.findByText("Uploading...")).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [new File(["img"], "service-2.png", { type: "image/png" })] } });
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to upload service image");
    });

    fireEvent.change(fileInput, { target: { files: [new File(["img"], "service-3.png", { type: "image/png" })] } });
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith("Service image uploaded");
    });
    expect(screen.getByRole("img", { name: "Service preview" })).toHaveAttribute("src", "https://example.com/uploaded-success.jpg");
  });

  it("opens edit mode with fallback values, updates a service, and deletes a service after confirmation", async () => {
    const user = userEvent.setup();
    apiMocks.getServices.mockResolvedValue({
      items: [{ ...baseService, id: "svc-9", rating: Number.NaN, categoryId: null, imageUrl: undefined, serviceType: "DEEP_CLEAN" }],
      total: 1,
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog", { name: "Update Service" });
    expect(within(dialog).getByLabelText("Rating (0 to 5)")).toHaveValue(0);
    expect(within(dialog).getByLabelText("Category")).toHaveValue("");
    expect(within(dialog).getByLabelText("Service Type")).toHaveValue("DEEP_CLEAN");
    expect(within(dialog).queryByText("Mark as popular after create")).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Category"), { target: { value: "1" } });
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Deep Cleaning Premium" } });
    await user.click(within(dialog).getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(apiMocks.updateService).toHaveBeenCalledWith(
        "svc-9",
        expect.objectContaining({
          name: "Deep Cleaning Premium",
          categoryId: 1,
          category_id: 1,
          imageUrl: undefined,
        }),
      );
    });
    expect(toastMock.success).toHaveBeenCalledWith("Service updated");

    await user.click((await screen.findAllByRole("button", { name: "Delete" }))[0]);
    expect(await screen.findByText("Delete Service")).toBeInTheDocument();
    await user.click((await screen.findAllByRole("button", { name: "Delete" })).at(-1) as HTMLElement);

    await waitFor(() => {
      expect(apiMocks.deleteService).toHaveBeenCalledWith("svc-9");
    });
    expect(toastMock.success).toHaveBeenCalledWith("Service deleted");
  });

  it("shows update and toggle failure toasts", async () => {
    const user = userEvent.setup();
    apiMocks.updateService.mockRejectedValueOnce(new Error("update failed"));
    apiMocks.toggleServiceStatus.mockRejectedValueOnce(new Error("toggle failed"));

    renderPage();

    await user.click((await screen.findAllByRole("button", { name: "Edit" }))[0]);
    const dialog = await screen.findByRole("dialog", { name: "Update Service" });
    await user.click(within(dialog).getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to update service");
    });

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Active" }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to toggle status");
    });
  });

  it("handles create flows for popular-service validation, missing ids, duplicates, and fallback errors", async () => {
    const user = userEvent.setup();

    renderPage();

    await openCreateModal();
    await fillCreateForm();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Please select Popular Category");
    });

    await openCreateModal();
    await fillCreateForm();
    await user.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Popular Category"), { target: { value: "9" } });
    apiMocks.createService.mockResolvedValueOnce({});
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith("Service created");
    });
    expect(toastMock).toHaveBeenCalledWith("Created, but auto-popular skipped (service id missing in response).", { icon: "!" });

    await openCreateModal();
    await fillCreateForm();
    await user.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Popular Category"), { target: { value: "9" } });
    popularMocks.createPopularService
      .mockRejectedValueOnce(new Error("priority already exists"))
      .mockResolvedValueOnce(undefined);
    popularMocks.getPopularServicesByCategory
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ priority: 1 }]);
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(popularMocks.createPopularService).toHaveBeenNthCalledWith(1, { serviceId: 44, categoryId: 9, priority: 1 });
      expect(popularMocks.createPopularService).toHaveBeenNthCalledWith(2, { serviceId: 44, categoryId: 9, priority: 2 });
    });
    expect(toastMock.success).toHaveBeenCalledWith("Service created and marked popular at priority 2");

    await openCreateModal();
    await fillCreateForm();
    await user.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Popular Category"), { target: { value: "9" } });
    popularMocks.createPopularService.mockRejectedValueOnce(new Error("server down"));
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to create service");
    });
    await user.click(screen.getByRole("button", { name: "Close" }));

    await openCreateModal();
    await fillCreateForm();
    await user.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Popular Category"), { target: { value: "9" } });
    popularMocks.createPopularService.mockRejectedValue(new Error("duplicate"));
    popularMocks.getPopularServicesByCategory.mockResolvedValue(Array.from({ length: 8 }, (_, index) => ({ priority: index + 1 })));
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to create service");
    });
  }, 10000);

  it("handles direct popular success plus create and delete failures", async () => {
    const user = userEvent.setup();
    apiMocks.createService
      .mockRejectedValueOnce(new Error("create failed"))
      .mockResolvedValueOnce({ id: 66 });
    apiMocks.deleteService.mockRejectedValueOnce(new Error("delete failed"));

    renderPage();

    await openCreateModal();
    await fillCreateForm();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to create service");
    });
    await user.click(screen.getByRole("button", { name: "Close" }));

    await openCreateModal();
    await fillCreateForm();
    await user.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Popular Category"), { target: { value: "9" } });
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith("Service created and marked popular");
    });

    await user.click((await screen.findAllByRole("button", { name: "Delete" }))[0]);
    expect(await screen.findByText("Delete Service")).toBeInTheDocument();
    await user.click((await screen.findAllByRole("button", { name: "Delete" })).at(-1) as HTMLElement);
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Unable to delete service");
    });
  });

  it("retries duplicate-style popular creation errors from response payloads", async () => {
    const user = userEvent.setup();
    popularMocks.getPopularServicesByCategory
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ priority: 1 }]);
    popularMocks.createPopularService
      .mockRejectedValueOnce({ response: { data: { message: "Priority already exists" } } })
      .mockResolvedValueOnce(undefined);

    renderPage();

    await openCreateModal();
    await fillCreateForm();
    await user.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Popular Category"), { target: { value: "9" } });
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(popularMocks.createPopularService).toHaveBeenNthCalledWith(1, { serviceId: 44, categoryId: 9, priority: 1 });
      expect(popularMocks.createPopularService).toHaveBeenNthCalledWith(2, { serviceId: 44, categoryId: 9, priority: 2 });
    });
  });
});
