import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getPartnerStats: vi.fn(),
  getPartners: vi.fn(),
  getPartnerDetails: vi.fn(),
  getPartnerDashboardStats: vi.fn(),
  getPartnerSettlements: vi.fn(),
  approvePartner: vi.fn(),
  rejectPartner: vi.fn(),
  blockPartner: vi.fn(),
  unblockPartner: vi.fn(),
  deletePartner: vi.fn(),
  updatePartnerAvailability: vi.fn(),
  updateSettlementStatus: vi.fn(),
  reviewPartnerKycDocument: vi.fn(),
  forcePartnerAvailability: vi.fn(),
  updatePartnerSkillsGovernance: vi.fn(),
  runPartnerRiskAction: vi.fn(),
}));

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  queryClient: {
    refetchQueries: vi.fn(),
    fetchQuery: vi.fn(),
  },
}));

vi.mock("@/features/providers/api/partnersApi", () => apiMocks);
vi.mock("@tanstack/react-query", () => ({
  useQuery: reactQueryMocks.useQuery,
  useMutation: reactQueryMocks.useMutation,
  useQueryClient: reactQueryMocks.useQueryClient,
}));

import {
  usePartnerDashboardStatsQuery,
  usePartnerDetailsQuery,
  usePartnerMutations,
  usePartnersQuery,
  usePartnerSettlementsQuery,
  usePartnerStatsQuery,
} from "@/features/providers/hooks/useProviders";

describe("providers hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reactQueryMocks.useQueryClient.mockReturnValue(reactQueryMocks.queryClient);
    reactQueryMocks.useQuery.mockImplementation((config) => config);
    reactQueryMocks.useMutation.mockImplementation((config) => config);
  });

  it("builds stats, list, details, dashboard, and settlements queries", () => {
    const listParams = {
      page: 1,
      size: 10,
      status: "PENDING" as const,
      serviceType: "COOK" as const,
      city: "Delhi",
      search: "rahul",
      sortBy: "createdAt",
      sortDir: "desc" as const,
    };
    const settlementParams = { page: 0, size: 10, search: "payout", status: "PENDING" as const };

    const statsQuery = usePartnerStatsQuery();
    const listQuery = usePartnersQuery(listParams);
    const detailsQuery = usePartnerDetailsQuery(undefined);
    const dashboardQuery = usePartnerDashboardStatsQuery("prv-1");
    const settlementsQuery = usePartnerSettlementsQuery(settlementParams);

    expect(statsQuery.queryFn).toBe(apiMocks.getPartnerStats);
    expect(listQuery.queryKey).toEqual(["admin-partners", listParams]);
    expect(listQuery.queryFn()).toBe(apiMocks.getPartners(listParams));
    expect(listQuery.placeholderData({ rows: [] })).toEqual({ rows: [] });
    expect(detailsQuery.enabled).toBe(false);
    expect(detailsQuery.queryFn()).toBe(apiMocks.getPartnerDetails(""));
    expect(dashboardQuery.queryFn()).toBe(apiMocks.getPartnerDashboardStats("prv-1"));
    expect(settlementsQuery.queryKey).toEqual(["admin-partner-settlements", settlementParams]);
    expect(settlementsQuery.queryFn()).toBe(apiMocks.getPartnerSettlements(settlementParams));
  });

  it("refreshes list and partner detail queries after all mutations", async () => {
    const mutations = usePartnerMutations();

    expect(mutations.approvePartnerMutation.mutationFn("prv-1")).toBe(apiMocks.approvePartner("prv-1"));
    await mutations.approvePartnerMutation.onSuccess?.(undefined, "prv-1", undefined);
    expect(reactQueryMocks.queryClient.fetchQuery).toHaveBeenCalledWith({
      queryKey: ["admin-partner-details", "prv-1"],
      queryFn: expect.any(Function),
    });
    expect(reactQueryMocks.queryClient.refetchQueries).toHaveBeenCalledWith({ queryKey: ["admin-partners"], type: "active" });
    expect(reactQueryMocks.queryClient.refetchQueries).toHaveBeenCalledWith({ queryKey: ["admin-partner-stats"], type: "active" });
    expect(reactQueryMocks.queryClient.refetchQueries).toHaveBeenCalledWith({ queryKey: ["admin-partner-settlements"], type: "active" });

    expect(mutations.rejectPartnerMutation.mutationFn({ id: "prv-2", reason: "bad docs" })).toBe(apiMocks.rejectPartner("prv-2", "bad docs"));
    await mutations.rejectPartnerMutation.onSuccess?.(undefined, { id: "prv-2", reason: "bad docs" }, undefined);

    expect(mutations.blockPartnerMutation.mutationFn({ id: "prv-3", reason: "fraud" })).toBe(apiMocks.blockPartner("prv-3", "fraud"));
    await mutations.blockPartnerMutation.onSuccess?.(undefined, { id: "prv-3", reason: "fraud" }, undefined);

    expect(mutations.unblockPartnerMutation.mutationFn("prv-4")).toBe(apiMocks.unblockPartner("prv-4"));
    await mutations.unblockPartnerMutation.onSuccess?.(undefined, "prv-4", undefined);

    expect(mutations.deletePartnerMutation.mutationFn("prv-5")).toBe(apiMocks.deletePartner("prv-5"));
    await mutations.deletePartnerMutation.onSuccess?.(undefined, "prv-5", undefined);

    expect(mutations.updatePartnerAvailabilityMutation.mutationFn({ id: "prv-6", online: true })).toBe(
      apiMocks.updatePartnerAvailability("prv-6", true),
    );
    await mutations.updatePartnerAvailabilityMutation.onSuccess?.(undefined, { id: "prv-6", online: true }, undefined);

    expect(mutations.updateSettlementStatusMutation.mutationFn({ payoutId: "po-1", status: "SETTLED", remarks: "done" })).toBe(
      apiMocks.updateSettlementStatus("po-1", "SETTLED", "done"),
    );
    await mutations.updateSettlementStatusMutation.onSuccess?.(undefined, { payoutId: "po-1", status: "SETTLED", remarks: "done" }, undefined);

    expect(
      mutations.reviewPartnerKycDocumentMutation.mutationFn({
        partnerId: "prv-7",
        documentId: "doc-1",
        decision: "APPROVED",
        reason: "clear",
      }),
    ).toBe(apiMocks.reviewPartnerKycDocument("prv-7", "doc-1", "APPROVED", "clear"));
    await mutations.reviewPartnerKycDocumentMutation.onSuccess?.(
      undefined,
      { partnerId: "prv-7", documentId: "doc-1", decision: "APPROVED", reason: "clear" },
      undefined,
    );

    expect(
      mutations.forcePartnerAvailabilityMutation.mutationFn({
        partnerId: "prv-8",
        online: false,
        lockMinutes: 60,
        reason: "audit",
      }),
    ).toBe(apiMocks.forcePartnerAvailability("prv-8", { online: false, lockMinutes: 60, reason: "audit" }));
    await mutations.forcePartnerAvailabilityMutation.onSuccess?.(
      undefined,
      { partnerId: "prv-8", online: false, lockMinutes: 60, reason: "audit" },
      undefined,
    );

    expect(
      mutations.updatePartnerSkillsGovernanceMutation.mutationFn({
        partnerId: "prv-9",
        categoryIds: [1, 2],
        subServiceIds: [11],
      }),
    ).toBe(apiMocks.updatePartnerSkillsGovernance("prv-9", { categoryIds: [1, 2], subServiceIds: [11] }));
    await mutations.updatePartnerSkillsGovernanceMutation.onSuccess?.(
      undefined,
      { partnerId: "prv-9", categoryIds: [1, 2], subServiceIds: [11] },
      undefined,
    );

    expect(
      mutations.runPartnerRiskActionMutation.mutationFn({
        partnerId: "prv-10",
        action: "FLAG_FRAUD",
        reason: "duplicate",
      }),
    ).toBe(apiMocks.runPartnerRiskAction("prv-10", { action: "FLAG_FRAUD", reason: "duplicate" }));
    await mutations.runPartnerRiskActionMutation.onSuccess?.(
      undefined,
      { partnerId: "prv-10", action: "FLAG_FRAUD", reason: "duplicate" },
      undefined,
    );
  });
});
