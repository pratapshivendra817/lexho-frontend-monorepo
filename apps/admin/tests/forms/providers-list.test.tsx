import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProvidersPage from "@/features/providers/pages/ProvidersPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const mocks = vi.hoisted(() => ({
  getProviderStats: vi.fn(),
  getProviders: vi.fn(),
  getProviderDetails: vi.fn(),
  approveProvider: vi.fn(),
  rejectProvider: vi.fn(),
  blockProvider: vi.fn(),
  unblockProvider: vi.fn(),
  deleteProvider: vi.fn(),
  downloadProviderDocument: vi.fn(),
}));

vi.mock("@/features/providers/api/providersApi", () => ({
  getProviderStats: mocks.getProviderStats,
  getProviders: mocks.getProviders,
  getProviderDetails: mocks.getProviderDetails,
  approveProvider: mocks.approveProvider,
  rejectProvider: mocks.rejectProvider,
  blockProvider: mocks.blockProvider,
  unblockProvider: mocks.unblockProvider,
  deleteProvider: mocks.deleteProvider,
  downloadProviderDocument: mocks.downloadProviderDocument,
  providerServiceTypes: ["", "COOK", "CLEANING"],
}));

describe("ProvidersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getProviderStats.mockResolvedValue({
      pending: 1,
      approved: 2,
      rejected: 0,
      blocked: 0,
    });

    mocks.getProviders.mockResolvedValue({
      content: [
        {
          id: "prv-1",
          name: "Rahul",
          phone: "9999999999",
          serviceType: "COOK",
          city: "Delhi",
          appliedDate: "2026-04-26",
          status: "PENDING",
        },
      ],
      totalElements: 1,
      totalPages: 1,
      pageNumber: 0,
    });

    mocks.approveProvider.mockResolvedValue(undefined);
    mocks.rejectProvider.mockResolvedValue(undefined);
    mocks.deleteProvider.mockResolvedValue(undefined);
  });

  it("renders providers and executes approve/reject/delete actions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProvidersPage />);

    expect(await screen.findByText("Rahul")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Approve$/i }));
    const approveDialog = await screen.findByRole("dialog", { name: "Approve Provider" });
    await user.click(within(approveDialog).getByRole("button", { name: /^Confirm$/i }));
    await waitFor(() => {
      expect(mocks.approveProvider).toHaveBeenCalledWith("prv-1");
    });

    await user.click(screen.getByRole("button", { name: /^Reject$/i }));
    const rejectDialog = await screen.findByRole("dialog", { name: "Reject Provider" });
    await user.type(within(rejectDialog).getByPlaceholderText("Enter reason"), "Invalid documents");
    await user.click(within(rejectDialog).getByRole("button", { name: /^Reject$/i }));
    await waitFor(() => {
      expect(mocks.rejectProvider).toHaveBeenCalledWith("prv-1", "Invalid documents");
    });

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));
    const deleteDialog = await screen.findByRole("dialog", { name: "Delete Provider" });
    await user.click(within(deleteDialog).getByRole("button", { name: /^Confirm$/i }));
    await waitFor(() => {
      expect(mocks.deleteProvider).toHaveBeenCalledWith("prv-1");
    });
  });
});
