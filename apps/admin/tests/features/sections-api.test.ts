import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    patch: mocks.patch,
    delete: mocks.delete,
  },
}));

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
} from "@/features/sections/api/sectionsApi";

describe("sectionsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes sections and items from nested payloads", async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: {
          results: [
            {
              sectionId: "7",
              type: "stats",
              title: " Main Stats ",
              description: " Dashboard block ",
              icon: "shield",
              textColor: " #111 ",
              border_color: "#222",
              bgColor: "#333",
              icon_color: "#444",
              priority: "5",
              isActive: "enabled",
              createdAt: 12345,
              items: [
                {
                  itemId: "11",
                  title: " Orders ",
                  subtitle: " done ",
                  value: 99,
                  icon: "truck",
                  text_color: "#555",
                  borderColor: "#666",
                  background_color: "#777",
                  iconColor: "#888",
                  priority: "2",
                  status: "ACTIVE",
                },
              ],
            },
            {
              id: "9",
              type: "unknown",
              title: "skip me",
            },
          ],
        },
      },
    });

    await expect(getSections()).resolves.toEqual([
      {
        id: 7,
        type: "STATS",
        title: "Main Stats",
        subtitle: "Dashboard block",
        icon: "shield",
        color: "#111",
        borderColor: "#222",
        backgroundColor: "#333",
        iconColor: "#444",
        priority: 5,
        active: true,
        createdAt: "12345",
        items: [
          {
            id: 11,
            sectionId: 7,
            title: "Orders",
            subtitle: "done",
            value: "99",
            icon: "truck",
            color: "#555",
            borderColor: "#666",
            backgroundColor: "#777",
            iconColor: "#888",
            priority: 2,
            active: true,
          },
        ],
      },
    ]);

    expect(mocks.get).toHaveBeenCalledWith("/api/admin/sections", { params: { page: 0, size: 10 } });
  });

  it("returns empty sections when no valid rows exist", async () => {
    mocks.get.mockResolvedValue({ data: { content: [{ type: "nope" }] } });
    await expect(getSections()).resolves.toEqual([]);
  });

  it("handles direct arrays, false-like flags, missing colors, and empty payload containers", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: [
          {
            id: "3",
            type: "trust",
            title: 404,
            subtitle: "",
            icon: 0,
            priority: "bad",
            active: "disabled",
            items: [
              {
                id: "6",
                title: " Item ",
                subtitle: "",
                value: "",
                icon: 9,
                priority: "bad",
                active: "no",
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ data: { data: null } });

    await expect(getSections()).resolves.toEqual([
      {
        id: 3,
        type: "TRUST",
        title: "404",
        subtitle: null,
        icon: "0",
        color: null,
        borderColor: null,
        backgroundColor: null,
        iconColor: null,
        priority: 1,
        active: false,
        createdAt: null,
        items: [
          {
            id: 6,
            sectionId: 3,
            title: "Item",
            subtitle: null,
            value: null,
            icon: "9",
            color: null,
            borderColor: null,
            backgroundColor: null,
            iconColor: null,
            priority: 1,
            active: false,
          },
        ],
      },
    ]);

    await expect(getSections()).resolves.toEqual([]);
  });

  it("falls back to default boolean values for unrecognized status strings", async () => {
    mocks.get.mockResolvedValue({
      data: {
        items: [
          {
            id: 12,
            type: "TAGLINE",
            title: "Fallback status",
            active: "maybe",
            items: [
              {
                id: 77,
                title: "Child",
                icon: "dot",
                active: "unknown",
              },
            ],
          },
        ],
      },
    });

    await expect(getSections()).resolves.toEqual([
      expect.objectContaining({
        id: 12,
        type: "TAGLINE",
        active: true,
        items: [expect.objectContaining({ id: 77, active: true })],
      }),
    ]);
  });

  it("calls create, update, status, reorder and item endpoints", async () => {
    mocks.post.mockResolvedValueOnce({ data: { ok: "create" } });
    mocks.put.mockResolvedValueOnce({ data: { ok: "update" } });
    mocks.patch.mockResolvedValueOnce({ data: { ok: "status" } });
    mocks.patch.mockResolvedValueOnce({ data: { ok: "reorder" } });
    mocks.put.mockResolvedValueOnce({ data: { ok: "item-update" } });
    mocks.patch.mockResolvedValueOnce({ data: { ok: "item-status" } });
    mocks.delete.mockResolvedValueOnce({ data: { ok: "item-delete" } });
    mocks.patch.mockResolvedValueOnce({ data: { ok: "item-reorder" } });

    await expect(
      createSection({ type: "TRUST", title: "Trust", priority: 1, isActive: true }),
    ).resolves.toEqual({ ok: "create" });
    await expect(
      updateSection(5, { type: "TRUST", title: "Trust", priority: 2, isActive: false }),
    ).resolves.toEqual({ ok: "update" });
    await expect(updateSectionStatus(5, true)).resolves.toEqual({ ok: "status" });
    await expect(reorderSections([{ id: 5, priority: 1 }])).resolves.toEqual({ ok: "reorder" });
    await expect(
      updateSectionItem(5, 8, { title: "Item", icon: "star", priority: 1, isActive: true }),
    ).resolves.toEqual({ ok: "item-update" });
    await expect(updateSectionItemStatus(5, 8, false)).resolves.toEqual({ ok: "item-status" });
    await expect(deleteSectionItem(5, 8)).resolves.toEqual({ ok: "item-delete" });
    await expect(reorderSectionItems(5, [{ id: 8, priority: 1 }])).resolves.toEqual({ ok: "item-reorder" });
  });

  it("adds section items using the primary array payload", async () => {
    mocks.post.mockResolvedValue({ data: { ok: "primary" } });

    await expect(
      addSectionItems(3, [{ title: "One", icon: "star", priority: 1, isActive: true }]),
    ).resolves.toEqual({ ok: "primary" });

    expect(mocks.post).toHaveBeenCalledWith("/api/admin/sections/3/items", [
      { title: "One", icon: "star", priority: 1, isActive: true },
    ]);
  });

  it("falls back to wrapped payload when primary add-items call returns 500", async () => {
    mocks.post
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({ data: { ok: "wrapped" } });

    await expect(
      addSectionItems(4, [{ title: "Two", icon: "star", priority: 1, isActive: true }]),
    ).resolves.toEqual({ ok: "wrapped" });

    expect(mocks.post).toHaveBeenNthCalledWith(2, "/api/admin/sections/4/items", {
      items: [{ title: "Two", icon: "star", priority: 1, isActive: true }],
    });
  });

  it("falls back to one-by-one add-items calls after two 500 responses", async () => {
    mocks.post
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({ data: { ok: "single-1" } })
      .mockResolvedValueOnce({ data: { ok: "single-2" } });

    await expect(
      addSectionItems(6, [
        { title: "One", icon: "a", priority: 1, isActive: true },
        { title: "Two", icon: "b", priority: 2, isActive: false },
      ]),
    ).resolves.toEqual({ ok: "single-2" });

    expect(mocks.post).toHaveBeenNthCalledWith(3, "/api/admin/sections/6/items", {
      title: "One",
      icon: "a",
      priority: 1,
      isActive: true,
    });
    expect(mocks.post).toHaveBeenNthCalledWith(4, "/api/admin/sections/6/items", {
      title: "Two",
      icon: "b",
      priority: 2,
      isActive: false,
    });
  });

  it("rethrows add-items errors when fallback should not continue", async () => {
    const error = { response: { status: 400 } };
    mocks.post.mockRejectedValue(error);

    await expect(
      addSectionItems(2, [{ title: "bad", icon: "x", priority: 1, isActive: true }]),
    ).rejects.toBe(error);
  });

  it("rethrows wrapped add-items errors when the second fallback should not continue", async () => {
    const error = { response: { status: 422 } };
    mocks.post.mockRejectedValueOnce({ response: { status: 500 } }).mockRejectedValueOnce(error);

    await expect(
      addSectionItems(9, [{ title: "bad", icon: "x", priority: 1, isActive: true }]),
    ).rejects.toBe(error);
  });
});
