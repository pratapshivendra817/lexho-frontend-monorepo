import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  invalidateQueries: vi.fn(),
  getSections: vi.fn(),
  createSection: vi.fn(),
  updateSection: vi.fn(),
  updateSectionStatus: vi.fn(),
  reorderSections: vi.fn(),
  addSectionItems: vi.fn(),
  updateSectionItem: vi.fn(),
  updateSectionItemStatus: vi.fn(),
  deleteSectionItem: vi.fn(),
  reorderSectionItems: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/features/sections/api/sectionsApi", () => ({
  getSections: mocks.getSections,
  createSection: mocks.createSection,
  updateSection: mocks.updateSection,
  updateSectionStatus: mocks.updateSectionStatus,
  reorderSections: mocks.reorderSections,
  addSectionItems: mocks.addSectionItems,
  updateSectionItem: mocks.updateSectionItem,
  updateSectionItemStatus: mocks.updateSectionItemStatus,
  deleteSectionItem: mocks.deleteSectionItem,
  reorderSectionItems: mocks.reorderSectionItems,
}));

import { useSectionsMutations, useSectionsQuery } from "@/features/sections";

describe("sections hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.useMutation.mockImplementation((options: any) => options);
  });

  it("configures the sections query", () => {
    mocks.useQuery.mockReturnValue({ data: [] });

    const { result } = renderHook(() => useSectionsQuery());

    expect(mocks.useQuery).toHaveBeenCalledWith({
      queryKey: ["admin-sections"],
      queryFn: mocks.getSections,
      retry: false,
    });
    expect(result.current).toEqual({ data: [] });
  });

  it("wires all mutations and invalidates sections after success", async () => {
    const { result } = renderHook(() => useSectionsMutations());
    const invalidateArg = { queryKey: ["admin-sections"] };

    await result.current.createSectionMutation.mutationFn({ type: "STATS" });
    expect(mocks.createSection).toHaveBeenCalledWith({ type: "STATS" });
    await result.current.createSectionMutation.onSuccess();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith(invalidateArg);

    await result.current.updateSectionMutation.mutationFn({ id: 1, payload: { type: "TRUST" } });
    expect(mocks.updateSection).toHaveBeenCalledWith(1, { type: "TRUST" });

    await result.current.updateSectionStatusMutation.mutationFn({ id: 2, isActive: true });
    expect(mocks.updateSectionStatus).toHaveBeenCalledWith(2, true);

    await result.current.reorderSectionsMutation.mutationFn([{ id: 1, priority: 3 }]);
    expect(mocks.reorderSections).toHaveBeenCalledWith([{ id: 1, priority: 3 }]);

    await result.current.addSectionItemsMutation.mutationFn({ id: 3, items: [{ title: "Item" }] });
    expect(mocks.addSectionItems).toHaveBeenCalledWith(3, [{ title: "Item" }]);

    await result.current.updateSectionItemMutation.mutationFn({ sectionId: 4, itemId: 5, payload: { title: "Edit" } });
    expect(mocks.updateSectionItem).toHaveBeenCalledWith(4, 5, { title: "Edit" });

    await result.current.updateSectionItemStatusMutation.mutationFn({ sectionId: 6, itemId: 7, isActive: false });
    expect(mocks.updateSectionItemStatus).toHaveBeenCalledWith(6, 7, false);

    await result.current.deleteSectionItemMutation.mutationFn({ sectionId: 8, itemId: 9 });
    expect(mocks.deleteSectionItem).toHaveBeenCalledWith(8, 9);

    await result.current.reorderSectionItemsMutation.mutationFn({ sectionId: 10, rows: [{ id: 11, priority: 1 }] });
    expect(mocks.reorderSectionItems).toHaveBeenCalledWith(10, [{ id: 11, priority: 1 }]);
  });
});
