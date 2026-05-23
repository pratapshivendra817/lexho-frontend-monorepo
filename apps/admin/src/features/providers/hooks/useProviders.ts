import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approvePartner,
  blockPartner,
  deletePartner,
  getPartnerDashboardStats,
  getPartnerDetails,
  getPartnerSettlements,
  getPartners,
  getPartnerStats,
  forcePartnerAvailability,
  rejectPartner,
  reviewPartnerKycDocument,
  runPartnerRiskAction,
  unblockPartner,
  updatePartnerSkillsGovernance,
  updatePartnerAvailability,
  updateSettlementStatus,
} from "../api/partnersApi";
import type { PartnerSettlementStatus, PartnersQueryParams } from "../types";

export function usePartnerStatsQuery() {
  return useQuery({
    queryKey: ["admin-partner-stats"],
    queryFn: getPartnerStats,
    retry: false,
  });
}

export function usePartnersQuery(params: PartnersQueryParams) {
  return useQuery({
    queryKey: ["admin-partners", params],
    queryFn: () => getPartners(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function usePartnerDetailsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-partner-details", id],
    queryFn: () => getPartnerDetails(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function usePartnerDashboardStatsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-partner-dashboard-stats", id],
    queryFn: () => getPartnerDashboardStats(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function usePartnerSettlementsQuery(params: {
  page: number;
  size: number;
  search?: string;
  status?: PartnerSettlementStatus | "";
}) {
  return useQuery({
    queryKey: ["admin-partner-settlements", params],
    queryFn: () => getPartnerSettlements(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function usePartnerMutations() {
  const queryClient = useQueryClient();

  const refreshPartners = async () => {
    await queryClient.refetchQueries({ queryKey: ["admin-partners"], type: "active" });
    await queryClient.refetchQueries({ queryKey: ["admin-partner-stats"], type: "active" });
    await queryClient.refetchQueries({ queryKey: ["admin-partner-settlements"], type: "active" });
  };

  const refreshPartnerDetails = async (id: string) => {
    await queryClient.fetchQuery({
      queryKey: ["admin-partner-details", id],
      queryFn: () => getPartnerDetails(id),
    });
    await queryClient.refetchQueries({ queryKey: ["admin-partner-dashboard-stats", id], type: "active" });
  };

  return {
    approvePartnerMutation: useMutation({
      mutationFn: (id: string) => approvePartner(id),
      onSuccess: async (_data, id) => {
        await refreshPartnerDetails(id);
        await refreshPartners();
      },
    }),
    rejectPartnerMutation: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectPartner(id, reason),
      onSuccess: async (_data, variables) => {
        await refreshPartnerDetails(variables.id);
        await refreshPartners();
      },
    }),
    blockPartnerMutation: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => blockPartner(id, reason),
      onSuccess: async (_data, variables) => {
        await refreshPartnerDetails(variables.id);
        await refreshPartners();
      },
    }),
    unblockPartnerMutation: useMutation({
      mutationFn: (id: string) => unblockPartner(id),
      onSuccess: async (_data, id) => {
        await refreshPartnerDetails(id);
        await refreshPartners();
      },
    }),
    deletePartnerMutation: useMutation({
      mutationFn: (id: string) => deletePartner(id),
      onSuccess: refreshPartners,
    }),
    updatePartnerAvailabilityMutation: useMutation({
      mutationFn: ({ id, online }: { id: string; online: boolean }) => updatePartnerAvailability(id, online),
      onSuccess: async (_data, variables) => {
        await refreshPartnerDetails(variables.id);
        await refreshPartners();
      },
    }),
    updateSettlementStatusMutation: useMutation({
      mutationFn: ({ payoutId, status, remarks }: { payoutId: string; status: PartnerSettlementStatus; remarks: string }) =>
        updateSettlementStatus(payoutId, status, remarks),
      onSuccess: refreshPartners,
    }),
    reviewPartnerKycDocumentMutation: useMutation({
      mutationFn: ({ partnerId, documentId, decision, reason }: { partnerId: string; documentId: string; decision: "APPROVED" | "REJECTED"; reason: string }) =>
        reviewPartnerKycDocument(partnerId, documentId, decision, reason),
      onSuccess: async (_data, variables) => {
        await refreshPartnerDetails(variables.partnerId);
      },
    }),
    forcePartnerAvailabilityMutation: useMutation({
      mutationFn: ({ partnerId, online, lockMinutes, reason }: { partnerId: string; online: boolean; lockMinutes: number; reason: string }) =>
        forcePartnerAvailability(partnerId, { online, lockMinutes, reason }),
      onSuccess: async (_data, variables) => {
        await refreshPartnerDetails(variables.partnerId);
        await refreshPartners();
      },
    }),
    updatePartnerSkillsGovernanceMutation: useMutation({
      mutationFn: ({ partnerId, categoryIds, subServiceIds }: { partnerId: string; categoryIds: number[]; subServiceIds: number[] }) =>
        updatePartnerSkillsGovernance(partnerId, { categoryIds, subServiceIds }),
      onSuccess: async (_data, variables) => {
        await refreshPartnerDetails(variables.partnerId);
      },
    }),
    runPartnerRiskActionMutation: useMutation({
      mutationFn: ({ partnerId, action, reason }: { partnerId: string; action: "SOFT_BLOCK" | "HARD_BLOCK" | "UNBLOCK" | "FLAG_FRAUD"; reason: string }) =>
        runPartnerRiskAction(partnerId, { action, reason }),
      onSuccess: async (_data, variables) => {
        await refreshPartnerDetails(variables.partnerId);
        await refreshPartners();
      },
    }),
  };
}


