import { describe, expect, it } from "vitest";

import * as providers from "@/features/providers";
import * as components from "@/features/providers/components";
import * as data from "@/features/providers/data";
import * as pages from "@/features/providers/pages";

describe("providers exports", () => {
  it("re-exports module, component, page, api, hook, and data surfaces", () => {
    expect(providers.partnersRoutes).toBeDefined();
    expect(providers.partnersNavItems).toBeDefined();
    expect(providers.partnerServiceTypes).toEqual(["", "COOK", "CLEANING"]);
    expect(providers.usePartnerMutations).toBeDefined();
    expect(providers.ProviderStatusBadge).toBe(components.ProviderStatusBadge);
    expect(providers.PartnersFiltersBar).toBe(components.PartnersFiltersBar);
    expect(providers.ProvidersStatsCards).toBe(components.ProvidersStatsCards);
    expect(pages.ProvidersPage).toBeDefined();
    expect(pages.ProviderVerificationPage).toBeDefined();
    expect(data.partnerData).toEqual(
      expect.objectContaining({
        id: "PR123",
        name: "Ravi Kumar",
        status: "PENDING",
      }),
    );
  });
});
