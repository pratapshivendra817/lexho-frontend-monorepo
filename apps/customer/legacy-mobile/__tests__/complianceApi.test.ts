const mockApi = { get: jest.fn(), post: jest.fn() };
const mockParse = jest.fn((_error: unknown, fallback: string) => fallback);

jest.mock("../src/api/client", () => ({
  api: { get: (...args: any[]) => (mockApi.get as any)(...args), post: (...args: any[]) => (mockApi.post as any)(...args) },
  parseApiError: (...args: any[]) => (mockParse as any)(...args),
  unwrapPayload: (data: any, fallback: any) => data?.data ?? data ?? fallback,
}));

import {
  acceptLegalDocument, cancelDeleteAccountRequest, createDeleteAccountRequest, getCustomerFaqs,
  getDeleteAccountStatus, getLegalAcceptanceHistory, getLegalDocument, getSupportContact,
} from "../src/api/complianceApi";

describe("compliance API", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("loads the published legal document and submits its exact type/version", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { title: "Terms", version: "2.1", effectiveDate: "2026-01-01", content: "Published terms" } } });
    await expect(getLegalDocument("terms")).resolves.toMatchObject({ type: "terms", title: "Terms", version: "2.1", content: "Published terms" });
    expect(mockApi.get).toHaveBeenCalledWith("/api/v1/legal/terms");
    mockApi.post.mockResolvedValueOnce({ data: {} });
    await expect(acceptLegalDocument("terms", "2.1")).resolves.toBeUndefined();
    expect(mockApi.post).toHaveBeenCalledWith("/api/v1/legal/accept", { documentType: "terms", version: "2.1" });
  });

  it("maps acceptance history, public customer FAQs and support contact", async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: [{ documentType: "privacy", version: "1", acceptedAt: "2026-01-01" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: 1, categoryName: "Bookings", question: "Where?", answer: "Here" }] } })
      .mockResolvedValueOnce({ data: { data: { supportEmail: "help@lexho.test", supportPhone: "9999999999" } } });
    await expect(getLegalAcceptanceHistory()).resolves.toEqual([{ documentType: "privacy", version: "1", acceptedAt: "2026-01-01" }]);
    await expect(getCustomerFaqs()).resolves.toEqual([{ id: "1", category: "Bookings", question: "Where?", answer: "Here" }]);
    await expect(getSupportContact()).resolves.toEqual({ email: "help@lexho.test", phone: "9999999999" });
    expect(mockApi.get).toHaveBeenNthCalledWith(2, "/api/v1/faqs", { params: { userType: "CUSTOMER" } });
  });

  it("handles the deletion request lifecycle without using an admin endpoint", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { accepted: true } } }).mockResolvedValueOnce({ data: {} });
    mockApi.get.mockResolvedValueOnce({ data: { data: { status: "SCHEDULED", canCancel: true, requestedAt: "2026-01-01" } } });
    await expect(createDeleteAccountRequest()).resolves.toEqual({ accepted: true });
    await expect(getDeleteAccountStatus()).resolves.toMatchObject({ status: "SCHEDULED", canCancel: true });
    await expect(cancelDeleteAccountRequest()).resolves.toBeUndefined();
    expect(mockApi.post).toHaveBeenNthCalledWith(1, "/api/v1/account/delete-request");
    expect(mockApi.post).toHaveBeenNthCalledWith(2, "/api/v1/account/delete-request/cancel");
  });

  it("returns no deletion status for a 404 and normalizes API errors", async () => {
    mockApi.get.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(getDeleteAccountStatus()).resolves.toBeNull();
    mockApi.get.mockRejectedValueOnce(new Error("offline"));
    await expect(getSupportContact()).rejects.toThrow("Unable to load support contact details");
  });
});
