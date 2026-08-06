import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePartnerDetailsQuery: vi.fn(),
  usePartnerDashboardStatsQuery: vi.fn(),
  usePartnerMutations: vi.fn(),
  useAdminNotificationMutations: vi.fn(),
  updateAvailabilityMutate: vi.fn(),
  reviewKycMutate: vi.fn(),
  forceAvailabilityMutate: vi.fn(),
  updateSkillsMutate: vi.fn(),
  riskActionMutate: vi.fn(),
  sendWarningMutate: vi.fn(),
  refetch: vi.fn(),
  shareContent: vi.fn(),
  downloadPartnerDocument: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  params: { id: "prv-55" as string | undefined },
}));

vi.mock("@/features/providers/hooks/usePartners", () => ({
  usePartnerDetailsQuery: mocks.usePartnerDetailsQuery,
  usePartnerDashboardStatsQuery: mocks.usePartnerDashboardStatsQuery,
  usePartnerMutations: mocks.usePartnerMutations,
}));

vi.mock("@/features/notifications/hooks/useAdminNotifications", () => ({
  useAdminNotificationMutations: mocks.useAdminNotificationMutations,
}));

vi.mock("@/features/providers/api/partnersApi", () => ({
  downloadPartnerDocument: mocks.downloadPartnerDocument,
}));

vi.mock("@/utils/share", () => ({
  shareContent: mocks.shareContent,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/components/admin", () => ({
  DataState: ({ isLoading, isError, isEmpty, loadingText, errorText, emptyText, onRetry, children }: any) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>retry-details:{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
}));

vi.mock("@/features/providers/components", () => ({
  PartnerStatusBadge: ({ status }: { status: string }) => <div>{`status:${status}`}</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
    useParams: () => mocks.params,
  };
});

import ProviderVerificationPage from "@/features/providers/pages/ProviderVerificationPage";
import { renderWithProviders } from "../utils/renderWithProviders";

describe("ProviderVerificationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: { href: "https://admin.lexho.test/partners/prv-55" },
      writable: true,
    });
    mocks.params = { id: "prv-55" };
    mocks.usePartnerDashboardStatsQuery.mockReturnValue({
      data: { todayEarnings: 250, totalCompletedOrders: 8, pendingOrders: 2 },
    });
    mocks.downloadPartnerDocument.mockResolvedValue(undefined);
    mocks.usePartnerMutations.mockReturnValue({
      updatePartnerAvailabilityMutation: { mutate: mocks.updateAvailabilityMutate, isPending: false },
      reviewPartnerKycDocumentMutation: { mutate: mocks.reviewKycMutate },
      forcePartnerAvailabilityMutation: { mutate: mocks.forceAvailabilityMutate },
      updatePartnerSkillsGovernanceMutation: { mutate: mocks.updateSkillsMutate },
      runPartnerRiskActionMutation: { mutate: mocks.riskActionMutate },
    });
    mocks.useAdminNotificationMutations.mockReturnValue({
      sendMutation: { mutate: mocks.sendWarningMutate, isPending: false },
    });
    mocks.usePartnerDetailsQuery.mockReturnValue({
      data: {
        id: "prv-55",
        name: "Rahul",
        email: "rahul@test.com",
        phone: "9999999999",
        city: "Delhi",
        state: "Delhi",
        address: "Street 1",
        serviceType: "COOK",
        accountNumber: "1234",
        ifscCode: "IFSC0001",
        status: "PENDING",
        online: false,
        documents: [
          { id: "doc-1", name: "PAN", documentType: "PAN", previewUrl: "https://example.com/pan.png" },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
  });

  it("renders loading, error and empty states", async () => {
    const user = userEvent.setup();
    mocks.usePartnerDetailsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mocks.refetch,
    });

    const { rerender } = renderWithProviders(<ProviderVerificationPage />);
    expect(screen.getByText("Loading partner details...")).toBeInTheDocument();

    mocks.usePartnerDetailsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });
    rerender(<ProviderVerificationPage />);
    await user.click(screen.getByText("retry-details:Unable to load partner details"));
    expect(mocks.refetch).toHaveBeenCalled();

    mocks.usePartnerDetailsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    rerender(<ProviderVerificationPage />);
    expect(screen.getByText("Partner not found")).toBeInTheDocument();
  });

  it("renders details and executes partner governance actions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProviderVerificationPage />);

    expect(screen.getByText("Partner Details")).toBeInTheDocument();
    expect(screen.getByText("status:PENDING")).toBeInTheDocument();
    expect(screen.getByText("INR 250")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(mocks.shareContent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Partner Rahul",
        url: "https://admin.lexho.test/partners/prv-55",
        successMessage: "Partner details copied",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Set Online" }));
    expect(mocks.updateAvailabilityMutate).toHaveBeenCalledWith(
      { id: "prv-55", online: true },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const availabilityOptions = mocks.updateAvailabilityMutate.mock.calls[0][1];
    availabilityOptions.onSuccess();
    availabilityOptions.onError(new Error("availability failed"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Partner marked Online");
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to update availability: availability failed");

    await user.clear(screen.getByPlaceholderText("Lock minutes"));
    await user.type(screen.getByPlaceholderText("Lock minutes"), "90");
    const reasonInputs = screen.getAllByPlaceholderText("Reason");
    await user.clear(reasonInputs[0]);
    await user.type(reasonInputs[0], "audit hold");
    await user.click(screen.getByRole("button", { name: "Force Offline" }));
    expect(mocks.forceAvailabilityMutate).toHaveBeenCalledWith(
      { partnerId: "prv-55", online: false, lockMinutes: 90, reason: "audit hold" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const forceOptions = mocks.forceAvailabilityMutate.mock.calls[0][1];
    await act(async () => {
      forceOptions.onSuccess();
      forceOptions.onError(new Error("force failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Availability force-updated");
    expect(mocks.toastError).toHaveBeenCalledWith("Force availability failed: force failed");

    await user.type(screen.getByPlaceholderText("Category IDs (1,2)"), "1, 2");
    await user.type(screen.getByPlaceholderText("SubService IDs (11,12)"), "11, x");
    await user.click(screen.getByRole("button", { name: "Update Skills" }));
    expect(mocks.updateSkillsMutate).toHaveBeenCalledWith(
      { partnerId: "prv-55", categoryIds: [1, 2], subServiceIds: [11] },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const skillsOptions = mocks.updateSkillsMutate.mock.calls[0][1];
    await act(async () => {
      skillsOptions.onSuccess();
      skillsOptions.onError(new Error("skills failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Skills updated");
    expect(mocks.toastError).toHaveBeenCalledWith("Skills update failed: skills failed");

    await user.click(screen.getByRole("button", { name: "FLAG_FRAUD" }));
    expect(mocks.riskActionMutate).toHaveBeenCalledWith(
      { partnerId: "prv-55", action: "FLAG_FRAUD", reason: "Fraudulent behavior detected" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    await user.click(screen.getByRole("button", { name: "SOFT_BLOCK" }));
    await user.click(screen.getByRole("button", { name: "HARD_BLOCK" }));
    await user.click(screen.getByRole("button", { name: "UNBLOCK" }));
    expect(mocks.riskActionMutate).toHaveBeenCalledWith(
      { partnerId: "prv-55", action: "SOFT_BLOCK", reason: "Fraudulent behavior detected" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(mocks.riskActionMutate).toHaveBeenCalledWith(
      { partnerId: "prv-55", action: "HARD_BLOCK", reason: "Fraudulent behavior detected" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(mocks.riskActionMutate).toHaveBeenCalledWith(
      { partnerId: "prv-55", action: "UNBLOCK", reason: "Fraudulent behavior detected" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const riskOptions = mocks.riskActionMutate.mock.calls[0][1];
    await act(async () => {
      riskOptions.onSuccess();
      riskOptions.onError(new Error("risk failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("FLAG_FRAUD applied");
    expect(mocks.toastError).toHaveBeenCalledWith("Risk action failed: risk failed");

    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(mocks.downloadPartnerDocument).toHaveBeenCalledWith("prv-55", "doc-1", "https://example.com/pan.png");

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(mocks.reviewKycMutate).toHaveBeenCalledWith(
      { partnerId: "prv-55", documentId: "doc-1", decision: "APPROVED", reason: "Document is clear and valid" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const approveOptions = mocks.reviewKycMutate.mock.calls[0][1];
    await act(async () => {
      approveOptions.onSuccess();
      approveOptions.onError(new Error("kyc failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Document approved");
    expect(mocks.toastError).toHaveBeenCalledWith("KYC review failed: kyc failed");

    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(mocks.reviewKycMutate).toHaveBeenCalledWith(
      { partnerId: "prv-55", documentId: "doc-1", decision: "REJECTED", reason: "Document mismatch" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const rejectOptions = mocks.reviewKycMutate.mock.calls[1][1];
    await act(async () => {
      rejectOptions.onSuccess();
      rejectOptions.onError(new Error("kyc reject failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Document rejected");
    expect(mocks.toastError).toHaveBeenCalledWith("KYC review failed: kyc reject failed");
  });

  it("handles missing partner and missing document url branches safely", async () => {
    const user = userEvent.setup();
    mocks.usePartnerDetailsQuery.mockReturnValue({
      data: {
        id: "prv-77",
        name: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        address: "",
        serviceType: "",
        accountNumber: "",
        ifscCode: "",
        status: "BLOCKED",
        online: true,
        documents: [{ id: "doc-2", name: "", documentType: "AADHAR" }],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    const { rerender } = renderWithProviders(<ProviderVerificationPage />);
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Document URL not available");

    mocks.downloadPartnerDocument.mockRejectedValueOnce(new Error("download failed"));
    mocks.usePartnerDetailsQuery.mockReturnValue({
      data: {
        id: "prv-88",
        name: "Rohit",
        phone: "888",
        city: "Noida",
        serviceType: "CLEANING",
        status: "APPROVED",
        online: true,
        documents: [{ id: "doc-3", name: "PAN", documentType: "PAN", previewUrl: "https://example.com/doc.pdf" }],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    rerender(<ProviderVerificationPage />);
    await user.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Unable to download document: download failed");
    });
  });

  it("sends a warning through the existing admin notifications flow", async () => {
    const user = userEvent.setup();
    mocks.usePartnerDetailsQuery.mockReturnValue({
      data: {
        id: "55",
        name: "Rahul",
        email: "rahul@test.com",
        phone: "9999999999",
        city: "Delhi",
        state: "Delhi",
        address: "Street 1",
        serviceType: "COOK",
        accountNumber: "1234",
        ifscCode: "IFSC0001",
        status: "PENDING",
        online: false,
        documents: [],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    renderWithProviders(<ProviderVerificationPage />);

    await user.clear(screen.getByPlaceholderText("Warning type"));
    await user.type(screen.getByPlaceholderText("Warning type"), "DOCUMENT");
    await user.clear(screen.getByPlaceholderText("Reason"));
    await user.type(screen.getByPlaceholderText("Reason"), "Document mismatch found");
    await user.clear(screen.getByPlaceholderText("Guidance"));
    await user.type(screen.getByPlaceholderText("Guidance"), "Upload a valid document.");
    await user.clear(screen.getByPlaceholderText("Notification title"));
    await user.type(screen.getByPlaceholderText("Notification title"), "Document Compliance Warning");
    await user.clear(screen.getByPlaceholderText("Notification message"));
    await user.type(screen.getByPlaceholderText("Notification message"), "Your account received a warning. Tap to review it.");
    await user.click(screen.getByRole("button", { name: "Send Warning" }));

    expect(mocks.sendWarningMutate).toHaveBeenCalledWith(
      {
        title: "Document Compliance Warning",
        message: "Your account received a warning. Tap to review it.",
        notificationType: "WARNING",
        priority: "HIGH",
        channels: ["IN_APP", "PUSH"],
        targetUserType: "PARTNERS",
        userIds: [55],
        referenceType: "WARNING",
        referenceId: "55",
        redirectType: "WARNING",
        redirectValue: "55",
        city: "Delhi",
        warningType: "DOCUMENT",
        reason: "Document mismatch found",
        guidance: "Upload a valid document.",
        notificationTitle: "Document Compliance Warning",
        notificationMessage: "Your account received a warning. Tap to review it.",
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );

    const sendOptions = mocks.sendWarningMutate.mock.calls[0][1];
    await act(async () => {
      sendOptions.onSuccess();
      sendOptions.onError(new Error("send failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Warning sent to partner");
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to send warning: send failed");
  });

  it("uses share fallback values and shows updating state when availability is pending", async () => {
    const user = userEvent.setup();
    mocks.usePartnerDashboardStatsQuery.mockReturnValue({ data: undefined });
    mocks.usePartnerMutations.mockReturnValue({
      updatePartnerAvailabilityMutation: { mutate: mocks.updateAvailabilityMutate, isPending: true },
      reviewPartnerKycDocumentMutation: { mutate: mocks.reviewKycMutate },
      forcePartnerAvailabilityMutation: { mutate: mocks.forceAvailabilityMutate },
      updatePartnerSkillsGovernanceMutation: { mutate: mocks.updateSkillsMutate },
      runPartnerRiskActionMutation: { mutate: mocks.riskActionMutate },
    });
    mocks.usePartnerDetailsQuery.mockReturnValue({
      data: {
        id: "prv-fallback",
        name: "",
        phone: "",
        city: "",
        state: "",
        address: "",
        serviceType: "",
        accountNumber: "",
        ifscCode: "",
        status: "APPROVED",
        online: true,
        documents: [],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    renderWithProviders(<ProviderVerificationPage />);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
    expect(screen.getByText("INR 0")).toBeInTheDocument();
    expect(screen.getByText("No documents uploaded.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(mocks.shareContent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Partner prv-fallback",
        text: expect.stringContaining("City: -"),
      }),
    );
  });
});
