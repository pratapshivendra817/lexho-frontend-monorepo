const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock("./api", () => ({
  __esModule: true,
  default: { get: (...args: any[]) => mockGet(...args), post: (...args: any[]) => mockPost(...args) },
  getReadableApiError: (_error: unknown, fallback: string) => fallback,
}));

import { acceptLegalDocument, cancelDeleteAccountRequest, createDeleteAccountRequest, getDeleteAccountStatus, getPartnerFaqs, getPartnerLegalDocument, getSupportContact } from "./partnerComplianceService";

describe("partner compliance service", () => {
  beforeEach(() => jest.clearAllMocks());
  it("uses public partner legal and acceptance endpoints", async () => {
    mockGet.mockResolvedValueOnce({ data: { data: { title: "Partner Terms", version: "3", effectiveDate: "2026-01-01", content: "Terms" } } });
    await expect(getPartnerLegalDocument("partner-terms")).resolves.toMatchObject({ title: "Partner Terms", version: "3" });
    expect(mockGet).toHaveBeenCalledWith("/api/v1/legal/partner-terms");
    mockPost.mockResolvedValue({ data: {} });
    await acceptLegalDocument("partner-terms", "3");
    expect(mockPost).toHaveBeenCalledWith("/api/v1/legal/accept", { documentType: "partner-terms", version: "3" });
  });
  it("loads partner FAQs, support contact and delete-account lifecycle", async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [{ id: 1, category: "Bookings", question: "Q", answer: "A" }] } }).mockResolvedValueOnce({ data: { data: { supportEmail: "support@lexho.test", supportPhone: "999" } } }).mockResolvedValueOnce({ data: { data: { status: "SCHEDULED", canCancel: true } } });
    await expect(getPartnerFaqs()).resolves.toEqual([{ id: "1", category: "Bookings", question: "Q", answer: "A" }]);
    await expect(getSupportContact()).resolves.toEqual({ email: "support@lexho.test", phone: "999" });
    await expect(getDeleteAccountStatus()).resolves.toMatchObject({ status: "SCHEDULED", canCancel: true });
    mockPost.mockResolvedValue({ data: {} });
    await createDeleteAccountRequest(); await cancelDeleteAccountRequest();
    expect(mockPost).toHaveBeenCalledWith("/api/v1/account/delete-request");
    expect(mockPost).toHaveBeenCalledWith("/api/v1/account/delete-request/cancel");
  });
});
