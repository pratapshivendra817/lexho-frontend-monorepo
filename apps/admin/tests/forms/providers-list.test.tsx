import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PartnersPage from "@/features/partners/pages/PartnersPage";
import { renderWithPartners } from "../utils/renderWithPartners";

const mocks = vi.hoisted(() => ({
  getPartnerStats: vi.fn(),
  getPartners: vi.fn(),
  getPartnerDetails: vi.fn(),
  approvePartner: vi.fn(),
  rejectPartner: vi.fn(),
  blockPartner: vi.fn(),
  unblockPartner: vi.fn(),
  deletePartner: vi.fn(),
  downloadPartnerDocument: vi.fn(),
}));

vi.mock("@/features/providers/api/partnersApi", () => ({
  getPartnerStats: mocks.getPartnerStats,
  getPartners: mocks.getPartners,
  getPartnerDetails: mocks.getPartnerDetails,
  approvePartner: mocks.approvePartner,
  rejectPartner: mocks.rejectPartner,
  blockPartner: mocks.blockPartner,
  unblockPartner: mocks.unblockPartner,
  deletePartner: mocks.deletePartner,
  downloadPartnerDocument: mocks.downloadPartnerDocument,
  partnerServiceTypes: ["", "COOK", "CLEANING"],
}));

describe("PartnersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getPartnerStats.mockResolvedValue({
      pending: 1,
      approved: 2,
      rejected: 0,
      blocked: 0,
    });

    mocks.getPartners.mockResolvedValue({
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

    mocks.approvePartner.mockResolvedValue(undefined);
    mocks.rejectPartner.mockResolvedValue(undefined);
    mocks.deletePartner.mockResolvedValue(undefined);
  });

  it("renders partners and executes approve/reject/delete actions", async () => {
    const user = userEvent.setup();
    renderWithPartners(<PartnersPage />);

    expect(await screen.findByText("Rahul")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Approve$/i }));
    const approveDialog = await screen.findByRole("dialog", { name: "Approve Partner" });
    await user.click(within(approveDialog).getByRole("button", { name: /^Confirm$/i }));
    await waitFor(() => {
      expect(mocks.approvePartner).toHaveBeenCalledWith("prv-1");
    });

    await user.click(screen.getByRole("button", { name: /^Reject$/i }));
    const rejectDialog = await screen.findByRole("dialog", { name: "Reject Partner" });
    await user.type(within(rejectDialog).getByPlaceholderText("Enter reason"), "Invalid documents");
    await user.click(within(rejectDialog).getByRole("button", { name: /^Reject$/i }));
    await waitFor(() => {
      expect(mocks.rejectPartner).toHaveBeenCalledWith("prv-1", "Invalid documents");
    });

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));
    const deleteDialog = await screen.findByRole("dialog", { name: "Delete Partner" });
    await user.click(within(deleteDialog).getByRole("button", { name: /^Confirm$/i }));
    await waitFor(() => {
      expect(mocks.deletePartner).toHaveBeenCalledWith("prv-1");
    });
  });
});


