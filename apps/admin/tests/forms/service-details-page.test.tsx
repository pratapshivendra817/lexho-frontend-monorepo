import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ServiceDetailsPage from "@/features/services/pages/ServiceDetailsPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const adminMocks = vi.hoisted(() => ({
  getServiceById: vi.fn(),
  addServiceDetails: vi.fn(),
  updateServiceDetail: vi.fn(),
  deleteServiceDetail: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/lexhoAdminApi", () => ({
  getServiceById: adminMocks.getServiceById,
  addServiceDetails: adminMocks.addServiceDetails,
  updateServiceDetail: adminMocks.updateServiceDetail,
  deleteServiceDetail: adminMocks.deleteServiceDetail,
}));

vi.mock("react-hot-toast", () => ({
  default: toastMocks,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("ServiceDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminMocks.getServiceById.mockResolvedValue({
      id: "svc-1",
      name: "Deep Cleaning",
      description: "High quality service",
      price: 1299,
      serviceType: "HOME_CLEANING",
      details: [
        { id: "inc-1", type: "INCLUDED", itemName: "Mopping" },
        { id: "exc-1", type: "EXCLUDED", itemName: "Balcony cleaning" },
        { id: "faq-1", type: "FAQ", itemName: "Q1. Is material included?" },
        { id: "ins-1", type: "INSTRUCTION", itemName: "Keep water ready" },
      ],
    });
    adminMocks.addServiceDetails.mockResolvedValue(undefined);
    adminMocks.updateServiceDetail.mockResolvedValue(undefined);
    adminMocks.deleteServiceDetail.mockResolvedValue(undefined);
  });

  it("renders service details sections and navigates back", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-1", path: "/services/:id" });

    expect(await screen.findByText("Deep Cleaning")).toBeInTheDocument();
    expect(screen.getByText("High quality service")).toBeInTheDocument();
    expect(screen.getByText("Type: HOME_CLEANING")).toBeInTheDocument();
    expect(screen.getByText("Price: INR 1299.00")).toBeInTheDocument();
    expect(screen.getByText("Included Items")).toBeInTheDocument();
    expect(screen.getByText("Excluded Items")).toBeInTheDocument();
    expect(screen.getByText("FAQs")).toBeInTheDocument();
    expect(screen.getByText("Instructions")).toBeInTheDocument();
    expect(screen.getByText("Mopping")).toBeInTheDocument();
    expect(screen.getByText("Balcony cleaning")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to Services" }));
    expect(navigateMock).toHaveBeenCalledWith("/services");
  });

  it("shows loading and empty states", async () => {
    let resolveQuery: ((value: unknown) => void) | undefined;
    adminMocks.getServiceById.mockReturnValueOnce(new Promise((resolve) => {
      resolveQuery = resolve;
    }));

    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-1", path: "/services/:id" });
    expect(screen.getByText("Loading service details...")).toBeInTheDocument();

    resolveQuery?.(null);
    expect(await screen.findByText("Service not found")).toBeInTheDocument();
  });

  it("shows fallback values and empty sections for a sparse service payload", async () => {
    const user = userEvent.setup();
    adminMocks.getServiceById.mockResolvedValueOnce({
      id: "svc-2",
      name: "Minimal Service",
      description: "Bare minimum",
      price: undefined,
      serviceType: "",
      details: [],
    });

    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-2", path: "/services/:id" });

    expect(await screen.findByText("Minimal Service")).toBeInTheDocument();
    expect(screen.getByText("Type: -")).toBeInTheDocument();
    expect(screen.getByText("Price: INR 0.00")).toBeInTheDocument();
    expect(screen.getAllByText("No items available.")).toHaveLength(4);

    const dialogOpenUser = userEvent.setup();
    const buttons = await screen.findAllByRole("button", { name: "Add Item" });
    await dialogOpenUser.click(buttons[0]);

    const dialog = await screen.findByRole("dialog", { name: "Add Detail" });
    fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "" } });
    expect(within(dialog).getByRole("textbox")).toHaveAttribute("placeholder", "Enter one item per line");

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add Detail" })).not.toBeInTheDocument();
    });
  });

  it("shows error state and retries service loading", async () => {
    adminMocks.getServiceById.mockRejectedValueOnce(new Error("request failed"));

    const user = userEvent.setup();
    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-1", path: "/services/:id" });

    expect(await screen.findByText("Failed to load service details")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(adminMocks.getServiceById).toHaveBeenCalledTimes(2);
    });
  });

  it("validates empty and over-limit modal content", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-1", path: "/services/:id" });

    await user.click(await screen.findAllByRole("button", { name: "Add Item" }).then((buttons) => buttons[0]));
    const dialog = await screen.findByRole("dialog", { name: "Add Detail" });
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    expect(toastMocks.error).toHaveBeenCalledWith("Item text cannot be empty");

    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "x".repeat(256) } });
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    expect(toastMocks.error).toHaveBeenCalledWith("Each item must be 1-255 characters");
  });

  it("creates multiple FAQ details from parsed input and shows preview", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-1", path: "/services/:id" });

    const faqSection = (await screen.findByText("FAQs")).closest("section");
    expect(faqSection).not.toBeNull();
    await user.click(within(faqSection as HTMLElement).getByRole("button", { name: "Add Item" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Detail" });
    expect(within(dialog).getByRole("combobox")).toHaveValue("FAQ");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Q1. What is included?\nQ2. Is material extra?" } });

    expect(screen.getByText("Preview (2 items)")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("1. Q1. What is included?");
    expect(dialog).toHaveTextContent("2. Q2. Is material extra?");

    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(adminMocks.addServiceDetails).toHaveBeenCalledWith("svc-1", {
        type: "FAQ",
        items: ["Q1. What is included?", "Q2. Is material extra?"],
      });
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Detail added");
  });

  it("edits an existing detail and only submits the first parsed item", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-1", path: "/services/:id" });

    await user.click((await screen.findAllByRole("button", { name: "Edit" }))[2]);
    const dialog = await screen.findByRole("dialog", { name: "Update Detail" });
    const textBox = within(dialog).getByRole("textbox");
    expect(textBox).toHaveValue("Q1. Is material included?");

    await user.selectOptions(within(dialog).getByRole("combobox"), "FAQ");
    fireEvent.change(textBox, { target: { value: "Q1. Updated question?\nQ2. Ignored for edit" } });
    await user.click(within(dialog).getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(adminMocks.updateServiceDetail).toHaveBeenCalledWith("svc-1", "faq-1", {
        type: "FAQ",
        itemName: "Q1. Updated question?",
      });
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Detail updated");
  });

  it("deletes a detail item", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-1", path: "/services/:id" });

    await user.click((await screen.findAllByRole("button", { name: "Delete" }))[0]);

    await waitFor(() => {
      expect(adminMocks.deleteServiceDetail).toHaveBeenCalledWith("svc-1", "inc-1");
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Detail deleted");
  });

  it("shows add, update, and delete failure toasts", async () => {
    const user = userEvent.setup();
    adminMocks.addServiceDetails.mockRejectedValueOnce(new Error("add failed"));
    adminMocks.updateServiceDetail.mockRejectedValueOnce(new Error("update failed"));
    adminMocks.deleteServiceDetail.mockRejectedValueOnce(new Error("delete failed"));

    renderWithProviders(<ServiceDetailsPage />, { route: "/services/svc-1", path: "/services/:id" });

    const faqSection = (await screen.findByText("FAQs")).closest("section");
    expect(faqSection).not.toBeNull();
    await user.click(within(faqSection as HTMLElement).getByRole("button", { name: "Add Item" }));
    const createDialog = await screen.findByRole("dialog", { name: "Add Detail" });
    fireEvent.change(within(createDialog).getByRole("textbox"), { target: { value: "Q1. Failure path?" } });
    await user.click(within(createDialog).getByRole("button", { name: "Add" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Unable to add detail");
    });
    await user.click(within(createDialog).getByRole("button", { name: "Close" }));

    await user.click((await screen.findAllByRole("button", { name: "Edit" }))[0]);
    const updateDialog = await screen.findByRole("dialog", { name: "Update Detail" });
    await user.click(within(updateDialog).getByRole("button", { name: "Update" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Unable to update detail");
    });
    await user.click(within(updateDialog).getByRole("button", { name: "Close" }));

    await user.click((await screen.findAllByRole("button", { name: "Delete" }))[0]);
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Unable to delete detail");
    });
  });
});
