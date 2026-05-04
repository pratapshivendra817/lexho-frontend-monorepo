import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addSectionItems,
  createSection,
  getSections,
  reorderSections,
  updateSection,
  updateSectionStatus,
} from "../api/sectionsApi";
import type { SectionItemPayload, SectionPayload } from "../types";

export function useSectionsQuery() {
  return useQuery({
    queryKey: ["admin-sections"],
    queryFn: getSections,
    retry: false,
  });
}

export function useSectionsMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
  };

  return {
    createSectionMutation: useMutation({
      mutationFn: (payload: SectionPayload) => createSection(payload),
      onSuccess: invalidate,
    }),
    updateSectionMutation: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: SectionPayload }) => updateSection(id, payload),
      onSuccess: invalidate,
    }),
    updateSectionStatusMutation: useMutation({
      mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateSectionStatus(id, isActive),
      onSuccess: invalidate,
    }),
    reorderSectionsMutation: useMutation({
      mutationFn: (rows: Array<{ id: number; priority: number }>) => reorderSections(rows),
      onSuccess: invalidate,
    }),
    addSectionItemsMutation: useMutation({
      mutationFn: ({ id, items }: { id: number; items: SectionItemPayload[] }) => addSectionItems(id, items),
      onSuccess: invalidate,
    }),
  };
}
