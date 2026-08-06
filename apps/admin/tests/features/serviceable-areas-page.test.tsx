import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useServiceableAreas: vi.fn(),
  useCreateServiceableArea: vi.fn(),
  useUpdateServiceableArea: vi.fn(),
  useDeleteServiceableArea: vi.fn(),
  useToggleServiceableAreaStatus: vi.fn(),
  listRefetch: vi.fn(),
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
  toggleMutate: vi.fn(),
}));

vi.mock("@/features/serviceable-areas/hooks/useServiceableAreas", () => ({
  useServiceableAreas: mocks.useServiceableAreas,
  useCreateServiceableArea: mocks.useCreateServiceableArea,
  useUpdateServiceableArea: mocks.useUpdateServiceableArea,
  useDeleteServiceableArea: mocks.useDeleteServiceableArea,
  useToggleServiceableAreaStatus: mocks.useToggleServiceableAreaStatus,
}));

vi.mock("@/components/admin", () => ({
  DataState: ({ isError, isEmpty, errorText, emptyText, onRetry, children }: any) => {
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  ConfirmDialog: ({ open, description, onClose, onConfirm, isLoading }: any) =>
    open ? (
      <div>
        <p>{description}</p>
        <button onClick={onClose}>close-confirm</button>
        <button disabled={isLoading} onClick={onConfirm}>
          confirm-delete
        </button>
      </div>
    ) : null,
}));

vi.mock("@/features/serviceable-areas/components/SearchBar", () => ({
  SearchBar: ({ value, onChange }: any) => (
    <button onClick={() => onChange(`${value}-changed`)}>{`search:${value || "empty"}`}</button>
  ),
}));

vi.mock("@/features/serviceable-areas/components/PaginationControls", () => ({
  PaginationControls: ({ page, size, total, onPageChange, onSizeChange }: any) => (
    <div>
      <span>{`pagination:${page}:${size}:${total}`}</span>
      <button onClick={() => onPageChange(page + 1)}>next-page</button>
      <button onClick={() => onSizeChange(20)}>resize-page</button>
    </div>
  ),
}));

vi.mock("@/features/serviceable-areas/components/ServiceableAreaTable", () => ({
  ServiceableAreaTableSkeleton: () => <div>loading-skeleton</div>,
  ServiceableAreaTable: ({ items, onEdit, onDelete, onToggleStatus, statusPendingId, deletePendingId }: any) => (
    <div>
      <span>{`table:${items.length}:${statusPendingId ?? "none"}:${deletePendingId ?? "none"}`}</span>
      <button onClick={() => onEdit(items[0])}>table-edit</button>
      <button onClick={() => onDelete(items[0])}>table-delete</button>
      <button onClick={() => onToggleStatus(items[0])}>table-toggle</button>
    </div>
  ),
}));

vi.mock("@/features/serviceable-areas/components/AddEditServiceableAreaModal", () => ({
  AddEditServiceableAreaModal: ({ open, editingItem, duplicateCheck, onClose, onSubmit, isSubmitting }: any) =>
    open ? (
      <div>
        <span>{`modal:${editingItem?.id ?? "new"}:${String(isSubmitting)}`}</span>
        <button
          onClick={() =>
            onSubmit(
              { name: "Area", pincode: "110001", city: "Delhi", state: "Delhi", cityId: null, zoneId: null, polygonJson: null, active: true },
              editingItem?.id,
            )
          }
        >
          modal-submit
        </button>
        <button
          onClick={() =>
            duplicateCheck(
              { name: "Area", pincode: "110001", city: "Delhi", state: "Delhi", cityId: "", zoneId: "", polygonJson: "", active: true },
              editingItem?.id,
            )
          }
        >
          run-duplicate-check
        </button>
        <button onClick={onClose}>modal-close</button>
      </div>
    ) : null,
}));

vi.mock("@/features/serviceable-areas/pages/GeoManagementPage", () => ({
  default: () => <div>geo-management-page</div>,
}));

vi.mock("@/features/settings/pages/SettingsPage", () => ({
  default: () => <div>settings-page</div>,
}));

vi.mock("@/features/live-dispatch/pages/LiveDispatchMonitorPage", () => ({
  default: () => <div>live-dispatch-page</div>,
}));

import ServiceableAreaPage from "@/features/serviceable-areas/pages/ServiceableAreaPage";

const baseItem = {
  id: "1",
  name: "Central Zone",
  pincode: "110001",
  city: "Delhi",
  state: "Delhi",
  country: "India",
  active: true,
};

describe("ServiceableAreaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useServiceableAreas.mockReturnValue({
      data: { items: [baseItem], total: 1 },
      isLoading: false,
      isError: false,
      refetch: mocks.listRefetch,
    });
    mocks.useCreateServiceableArea.mockReturnValue({ isPending: false, mutate: mocks.createMutate });
    mocks.useUpdateServiceableArea.mockReturnValue({ isPending: false, mutate: mocks.updateMutate });
    mocks.useDeleteServiceableArea.mockReturnValue({ isPending: false, mutate: mocks.deleteMutate, variables: null });
    mocks.useToggleServiceableAreaStatus.mockReturnValue({ isPending: false, mutate: mocks.toggleMutate, variables: null });
  });

  it("renders list mode and wires filters, add, edit, delete, toggle and pagination", async () => {
    const user = userEvent.setup();
    render(<ServiceableAreaPage />);

    expect(screen.getByText("Serviceable Area Management")).toBeInTheDocument();
    expect(mocks.useServiceableAreas).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sortBy: "id",
      sortDir: "desc",
      query: undefined,
      status: "ALL",
    });

    await user.click(screen.getByText("search:empty"));
    expect(mocks.useServiceableAreas).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0, query: "-changed", status: "ALL" }),
    );

    await user.selectOptions(screen.getByDisplayValue("All status"), "ACTIVE");
    expect(mocks.useServiceableAreas).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0, status: "ACTIVE" }),
    );

    await user.selectOptions(screen.getByDisplayValue("Sort by ID"), "city");
    expect(mocks.useServiceableAreas).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: "city" }),
    );

    await user.selectOptions(screen.getByDisplayValue("Descending"), "asc");
    expect(mocks.useServiceableAreas).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortDir: "asc" }),
    );

    await user.click(screen.getByRole("button", { name: "+ Add Serviceable Area" }));
    expect(screen.getByText("modal:new:false")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "modal-submit" }));
    expect(mocks.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Area" }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const createOptions = mocks.createMutate.mock.calls[0][1];
    act(() => {
      createOptions.onSuccess();
    });
    expect(screen.queryByText("modal:new:false")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "table-edit" }));
    expect(screen.getByText("modal:1:false")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "run-duplicate-check" }));
    await user.click(screen.getByRole("button", { name: "modal-submit" }));
    expect(mocks.updateMutate).toHaveBeenCalledWith(
      { id: "1", payload: expect.objectContaining({ pincode: "110001" }) },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    await user.click(screen.getByRole("button", { name: "table-toggle" }));
    expect(mocks.toggleMutate).toHaveBeenCalledWith({ id: "1", active: false });

    await user.click(screen.getByRole("button", { name: "table-delete" }));
    expect(screen.getByText("Are you sure you want to delete 110001 (Delhi)?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "confirm-delete" }));
    expect(mocks.deleteMutate).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    await user.click(screen.getByRole("button", { name: "next-page" }));
    expect(mocks.useServiceableAreas).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));

    await user.click(screen.getByRole("button", { name: "resize-page" }));
    expect(mocks.useServiceableAreas).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 20 }));
  });

  it("renders loading, empty, error and pending states", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ServiceableAreaPage />);

    mocks.useServiceableAreas.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mocks.listRefetch,
    });
    rerender(<ServiceableAreaPage />);
    expect(screen.getByText("loading-skeleton")).toBeInTheDocument();

    mocks.useServiceableAreas.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: mocks.listRefetch,
    });
    rerender(<ServiceableAreaPage />);
    expect(screen.getByText("No serviceable areas found. Add one to get started.")).toBeInTheDocument();

    mocks.useServiceableAreas.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.listRefetch,
    });
    rerender(<ServiceableAreaPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load serviceable areas" }));
    expect(mocks.listRefetch).toHaveBeenCalled();

    mocks.useServiceableAreas.mockReturnValue({
      data: { items: [baseItem], total: 1 },
      isLoading: false,
      isError: false,
      refetch: mocks.listRefetch,
    });
    mocks.useDeleteServiceableArea.mockReturnValue({ isPending: true, mutate: mocks.deleteMutate, variables: "1" });
    mocks.useToggleServiceableAreaStatus.mockReturnValue({
      isPending: true,
      mutate: mocks.toggleMutate,
      variables: { id: "1", active: false },
    });
    rerender(<ServiceableAreaPage />);
    expect(screen.getByText("table:1:1:1")).toBeInTheDocument();
  });

  it("switches into geo, settings and live-dispatch modes", async () => {
    const user = userEvent.setup();
    render(<ServiceableAreaPage />);

    await user.click(screen.getByRole("button", { name: "Geo Cities & Zones" }));
    expect(screen.getByText("geo-management-page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByText("settings-page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Live Dispatch" }));
    expect(screen.getByText("live-dispatch-page")).toBeInTheDocument();
  });
});
