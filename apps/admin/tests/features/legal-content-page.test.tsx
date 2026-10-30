import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  getAdminLegalDocuments: vi.fn(),
  updateAdminLegalDocument: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/features/legal-content/api/legalContentApi", () => ({
  getAdminLegalDocuments: mocks.getAdminLegalDocuments,
  updateAdminLegalDocument: mocks.updateAdminLegalDocument,
}));

import LegalContentPage from "@/features/legal-content/pages/LegalContentPage";

const stableDocuments = {
  "terms-and-conditions": {
    slug: "terms-and-conditions",
    title: "Terms & Conditions",
    platform: "PARTNER" as const,
    documentType: "TERMS_AND_CONDITIONS" as const,
    format: "MARKDOWN" as const,
    status: "PUBLISHED" as const,
    version: 3,
    summary: "Partner app terms",
    content: "# Terms",
    updatedAt: "2026-08-16T10:00:00.000Z",
    publishedAt: "2026-08-16T10:00:00.000Z",
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    platform: "PARTNER" as const,
    documentType: "PRIVACY_POLICY" as const,
    format: "MARKDOWN" as const,
    status: "DRAFT" as const,
    version: 1,
    summary: "",
    content: "",
  },
  "about-us": {
    slug: "about-us",
    title: "About Us",
    platform: "PARTNER" as const,
    documentType: "ABOUT_US" as const,
    format: "MARKDOWN" as const,
    status: "DRAFT" as const,
    version: 1,
    summary: "",
    content: "",
  },
};

describe("LegalContentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockReturnValue({
      data: stableDocuments,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess, onError }) => ({
      isPending: false,
      mutate: async (publish: boolean) => {
        try {
          const result = await mutationFn(publish);
          await onSuccess?.(result, publish);
        } catch (error) {
          onError?.(error);
        }
      },
    }));
    mocks.updateAdminLegalDocument.mockImplementation(async (slug: string, payload: any) => ({
      ...stableDocuments[slug as keyof typeof stableDocuments],
      ...payload,
      slug,
      version: 4,
      status: payload.publish ? "PUBLISHED" : "DRAFT",
    }));
  });

  it("renders the selected document and saves draft and publish actions", async () => {
    const user = userEvent.setup();
    render(<LegalContentPage />);

    expect(screen.getByText("Legal Content")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Terms & Conditions")).toBeInTheDocument();
    expect(screen.getByDisplayValue("# Terms")).toBeInTheDocument();

    await user.clear(screen.getByDisplayValue("# Terms"));
    await user.type(screen.getByRole("textbox", { name: "Content" }), "## Updated terms");
    await user.type(screen.getByPlaceholderText("Explain what changed in this version"), "Updated intro");

    await user.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(mocks.updateAdminLegalDocument).toHaveBeenCalledWith(
      "terms-and-conditions",
      expect.objectContaining({
        content: "## Updated terms",
        changeNote: "Updated intro",
        publish: false,
      }),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Legal content saved");

    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(mocks.updateAdminLegalDocument).toHaveBeenLastCalledWith(
      "terms-and-conditions",
      expect.objectContaining({
        publish: true,
      }),
    );
  });

  it("switches documents, resets changes, and retries error state", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    const { rerender } = render(<LegalContentPage />);
    await user.click(screen.getByRole("button", { name: /Privacy Policy/i }));
    expect(screen.getByDisplayValue("Privacy Policy")).toBeInTheDocument();

    const titleInput = screen.getByDisplayValue("Privacy Policy");
    await user.clear(titleInput);
    await user.type(titleInput, "Partner Privacy Policy");
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByDisplayValue("Privacy Policy")).toBeInTheDocument();

    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    rerender(<LegalContentPage />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows loading and mutation failure states", async () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { rerender } = render(<LegalContentPage />);
    expect(screen.getByText("Loading legal content...")).toBeInTheDocument();

    mocks.useQuery.mockReturnValue({
      data: stableDocuments,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useMutation.mockImplementation(({ onError }) => ({
      isPending: false,
      mutate: () => onError?.(new Error("save failed")),
    }));

    rerender(<LegalContentPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Save Draft" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to save legal content");
  });
});
