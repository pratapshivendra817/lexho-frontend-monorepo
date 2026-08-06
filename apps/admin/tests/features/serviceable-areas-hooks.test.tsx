import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  cancelQueries: vi.fn(),
  getQueriesData: vi.fn(),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  extractApiError: vi.fn(),
  getServiceableAreas: vi.fn(),
  createServiceableArea: vi.fn(),
  updateServiceableArea: vi.fn(),
  deleteServiceableArea: vi.fn(),
  updateServiceableAreaStatus: vi.fn(),
  getGeoCities: vi.fn(),
  getGeoZones: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("@/features/serviceable-areas/api/serviceableAreasApi", () => ({
  getServiceableAreas: mocks.getServiceableAreas,
  createServiceableArea: mocks.createServiceableArea,
  updateServiceableArea: mocks.updateServiceableArea,
  deleteServiceableArea: mocks.deleteServiceableArea,
  updateServiceableAreaStatus: mocks.updateServiceableAreaStatus,
}));

vi.mock("@/features/serviceable-areas/api/geoApi", () => ({
  getGeoCities: mocks.getGeoCities,
  getGeoZones: mocks.getGeoZones,
}));

import {
  useCreateServiceableArea,
  useDeleteServiceableArea,
  useGeoCities,
  useGeoZones,
  useServiceableAreas,
  useToggleServiceableAreaStatus,
  useUpdateServiceableArea,
} from "@/features/serviceable-areas/hooks/useServiceableAreas";

describe("serviceable-areas hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractApiError.mockReturnValue("mapped error");
    mocks.useQuery.mockImplementation((options: unknown) => options);
    mocks.useMutation.mockImplementation((options: unknown) => options);
    mocks.useQueryClient.mockReturnValue({
      cancelQueries: mocks.cancelQueries,
      getQueriesData: mocks.getQueriesData,
      setQueryData: mocks.setQueryData,
      invalidateQueries: mocks.invalidateQueries,
    });
  });

  it("configures list and geo queries", () => {
    renderHook(() =>
      useServiceableAreas({ page: 1, size: 20, sortBy: "city", sortDir: "asc", query: "delhi", status: "ACTIVE" }),
    );
    renderHook(() => useGeoCities());
    renderHook(() => useGeoZones(12));

    expect(mocks.useQuery).toHaveBeenNthCalledWith(1, {
      queryKey: [
        "serviceable-areas",
        { page: 1, size: 20, sortBy: "city", sortDir: "asc", query: "delhi", status: "ACTIVE" },
      ],
      queryFn: expect.any(Function),
      retry: false,
    });
    expect(mocks.useQuery).toHaveBeenNthCalledWith(2, {
      queryKey: ["geo-cities"],
      queryFn: mocks.getGeoCities,
      retry: false,
    });
    expect(mocks.useQuery).toHaveBeenNthCalledWith(3, {
      queryKey: ["geo-zones", 12],
      queryFn: expect.any(Function),
      enabled: true,
      retry: false,
    });
  });

  it("wires mutations and optimistic status toggles", async () => {
    mocks.getQueriesData.mockReturnValue([
      [
        ["serviceable-areas", { page: 0 }],
        { items: [{ id: "1", active: false }, { id: "2", active: true }], total: 2, page: 0, size: 10 },
      ],
      [["serviceable-areas", { page: 1 }], undefined],
    ]);

    const { result } = renderHook(() => ({
      createMutation: useCreateServiceableArea(),
      updateMutation: useUpdateServiceableArea(),
      deleteMutation: useDeleteServiceableArea(),
      statusMutation: useToggleServiceableAreaStatus(),
    }));

    await result.current.createMutation.mutationFn({ name: "A" });
    expect(mocks.createServiceableArea).toHaveBeenCalledWith({ name: "A" });
    await result.current.createMutation.onSuccess();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Serviceable area created");

    await result.current.updateMutation.mutationFn({ id: "9", payload: { name: "B" } });
    expect(mocks.updateServiceableArea).toHaveBeenCalledWith("9", { name: "B" });

    await result.current.deleteMutation.mutationFn("7");
    expect(mocks.deleteServiceableArea).toHaveBeenCalledWith("7");

    await result.current.statusMutation.mutationFn({ id: "1", active: true });
    expect(mocks.updateServiceableAreaStatus).toHaveBeenCalledWith("1", true);

    const context = await result.current.statusMutation.onMutate({ id: "1", active: true });
    expect(mocks.cancelQueries).toHaveBeenCalledWith({ queryKey: ["serviceable-areas"] });
    expect(mocks.setQueryData).toHaveBeenCalledWith(
      ["serviceable-areas", { page: 0 }],
      expect.objectContaining({
        items: [expect.objectContaining({ id: "1", active: true }), expect.objectContaining({ id: "2", active: true })],
      }),
    );
    expect(context).toEqual({
      snapshots: [
        [
          ["serviceable-areas", { page: 0 }],
          { items: [{ id: "1", active: false }, { id: "2", active: true }], total: 2, page: 0, size: 10 },
        ],
        [["serviceable-areas", { page: 1 }], undefined],
      ],
    });

    await result.current.statusMutation.onError({ code: 500 }, { id: "1", active: true }, context);
    expect(mocks.setQueryData).toHaveBeenCalledWith(["serviceable-areas", { page: 0 }], context.snapshots[0][1]);
    expect(mocks.setQueryData).toHaveBeenCalledWith(["serviceable-areas", { page: 1 }], undefined);
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");

    await result.current.statusMutation.onSuccess();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Status updated");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["serviceable-areas"] });
  });

  it("shows extracted error messages for all mutation error handlers", async () => {
    const { result } = renderHook(() => ({
      createMutation: useCreateServiceableArea(),
      updateMutation: useUpdateServiceableArea(),
      deleteMutation: useDeleteServiceableArea(),
    }));

    result.current.createMutation.onError?.({ response: { status: 500 } });
    result.current.updateMutation.onError?.({ response: { status: 500 } });
    result.current.deleteMutation.onError?.({ response: { status: 500 } });

    expect(mocks.toastError).toHaveBeenNthCalledWith(1, "mapped error");
    expect(mocks.toastError).toHaveBeenNthCalledWith(2, "mapped error");
    expect(mocks.toastError).toHaveBeenNthCalledWith(3, "mapped error");
  });
});
