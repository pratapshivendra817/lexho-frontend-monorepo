jest.mock("../../../services/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
  getReadableApiError: jest.fn((error: any, fallback: string) => error?.message ?? fallback),
}));

import API, { getReadableApiError } from "../../../services/api";
import { getPartnerLegalDocument } from "./legalContentApi";

describe("legalContentApi", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getReadableApiError as jest.Mock).mockImplementation((error: any, fallback: string) => error?.message ?? fallback);
  });

  it("loads and normalizes a partner legal document from nested payloads", async () => {
    (API.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          data: {
            title: "Terms & Conditions",
            content: "# Terms",
            summary: "Partner summary",
            version: "4",
            updatedAt: "2026-08-16T10:00:00.000Z",
          },
        },
      },
    });

    await expect(getPartnerLegalDocument("terms-and-conditions")).resolves.toEqual({
      slug: "terms-and-conditions",
      title: "Terms & Conditions",
      format: "MARKDOWN",
      content: "# Terms",
      summary: "Partner summary",
      version: 4,
      updatedAt: "2026-08-16T10:00:00.000Z",
    });
    expect(API.get).toHaveBeenCalledWith("/api/v1/legal/partner-terms");
  });

  it("uses the public legal endpoint without an admin fallback", async () => {
    (API.get as jest.Mock).mockResolvedValueOnce({ data: { data: { markdown: "## Live terms" } } });
    await expect(getPartnerLegalDocument("terms-and-conditions")).resolves.toMatchObject({ slug: "terms-and-conditions", content: "## Live terms" });
    expect(API.get).toHaveBeenCalledTimes(1);
    expect(API.get).toHaveBeenCalledWith("/api/v1/legal/partner-terms");
  });

  it("throws a readable error when all endpoints fail", async () => {
    (API.get as jest.Mock).mockRejectedValue(new Error("Backend offline"));

    await expect(getPartnerLegalDocument("terms-and-conditions")).rejects.toThrow("Backend offline");
    expect(getReadableApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to load legal content");
  });
});
