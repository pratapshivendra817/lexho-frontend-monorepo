import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component: Component }: { component: () => JSX.Element }) => <Component />,
}));

vi.mock("@/features/legal-content/pages/LegalContentPage", () => ({
  default: () => <div>legal-content-page</div>,
}));

describe("legal content module", () => {
  it("exports routes, nav items, and route meta", async () => {
    const feature = await import("@/features/legal-content");

    expect(feature.legalContentRoutes).toEqual([
      { path: "/legal-content", element: expect.any(Object) },
    ]);
    expect(feature.legalContentNavItems).toEqual([
      { path: "/legal-content", label: "Legal Content" },
    ]);
    expect(feature.legalContentRouteMeta).toEqual([
      {
        pathPrefix: "/legal-content",
        title: "Legal Content",
        breadcrumb: "Configuration / Legal Content",
      },
    ]);
  });

  it("re-exports legal document types", async () => {
    const feature = await import("@/features/legal-content");
    expect(feature.legalDocumentDefinitions).toHaveLength(3);
    expect(feature.defaultLegalDocuments["terms-and-conditions"].title).toBe(
      "Terms & Conditions",
    );
  });
});
