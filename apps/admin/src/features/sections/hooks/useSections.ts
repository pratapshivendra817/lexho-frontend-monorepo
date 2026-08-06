import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addSectionItems,
  createSection,
  deleteSectionItem,
  getSections,
  reorderSectionItems,
  reorderSections,
  updateSection,
  updateSectionItem,
  updateSectionItemStatus,
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
    updateSectionItemMutation: useMutation({
      mutationFn: ({ sectionId, itemId, payload }: { sectionId: number; itemId: number; payload: SectionItemPayload }) =>
        updateSectionItem(sectionId, itemId, payload),
      onSuccess: invalidate,
    }),
    updateSectionItemStatusMutation: useMutation({
      mutationFn: ({ sectionId, itemId, isActive }: { sectionId: number; itemId: number; isActive: boolean }) =>
        updateSectionItemStatus(sectionId, itemId, isActive),
      onSuccess: invalidate,
    }),
    deleteSectionItemMutation: useMutation({
      mutationFn: ({ sectionId, itemId }: { sectionId: number; itemId: number }) => deleteSectionItem(sectionId, itemId),
      onSuccess: invalidate,
    }),
    reorderSectionItemsMutation: useMutation({
      mutationFn: ({ sectionId, rows }: { sectionId: number; rows: Array<{ id: number; priority: number }> }) =>
        reorderSectionItems(sectionId, rows),
      onSuccess: invalidate,
    }),
  };
}
