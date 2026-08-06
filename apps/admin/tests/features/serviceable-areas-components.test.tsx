import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminMocks = vi.hoisted(() => ({
  mapboxOnSave: undefined as ((value: string) => void) | undefined,
  mapboxOnChange: undefined as ((value: string) => void) | undefined,
}));

vi.mock("@/components/admin", () => ({
  ModalFormLayout: ({ open, title, onClose, submitLabel, isSubmitting, children, formId }: any) =>
    open ? (
      <div>
        <h2>{title}</h2>
        <button onClick={onClose}>close-modal</button>
        {children}
        <button form={formId} type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </div>
    ) : null,
  MapboxPolygonEditor: ({ value, onChange, onSave }: any) => {
    adminMocks.mapboxOnChange = onChange;
    adminMocks.mapboxOnSave = onSave;
    return <div data-testid="mapbox-editor">{value}</div>;
  },
  PolygonPreview: ({ polygonJson }: { polygonJson: string }) => <div data-testid="polygon-preview">{polygonJson}</div>,
}));

vi.mock("@/features/serviceable-areas/components/StatusToggle", () => ({
  StatusToggle: ({ checked, disabled, onChange }: any) => (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)}>
      {checked ? "switch-on" : "switch-off"}
    </button>
  ),
}));

import { AddEditServiceableAreaModal } from "@/features/serviceable-areas/components/AddEditServiceableAreaModal";
import { PaginationControls } from "@/features/serviceable-areas/components/PaginationControls";
import { SearchBar } from "@/features/serviceable-areas/components/SearchBar";
import {
  ServiceableAreaTable,
  ServiceableAreaTableSkeleton,
} from "@/features/serviceable-areas/components/ServiceableAreaTable";
import { StatusToggle } from "@/features/serviceable-areas/components/StatusToggle";

describe("serviceable-areas components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminMocks.mapboxOnChange = undefined;
    adminMocks.mapboxOnSave = undefined;
  });

  it("renders and interacts with search, pagination, table, skeleton and toggle components", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onPageChange = vi.fn();
    const onSizeChange = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onToggleStatus = vi.fn();
    const area = {
      id: "1",
      name: "",
      pincode: "110001",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      active: false,
    };

    const { rerender } = render(
      <div>
        <SearchBar value="abc" onChange={onSearchChange} placeholder="Search areas" />
        <PaginationControls page={0} size={10} total={25} onPageChange={onPageChange} onSizeChange={onSizeChange} />
        <ServiceableAreaTable
          items={[area]}
          statusPendingId={null}
          deletePendingId={null}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
        />
        <ServiceableAreaTableSkeleton />
        <StatusToggle checked disabled={false} onChange={onToggleStatus} />
      </div>,
    );

    await user.type(screen.getByPlaceholderText("Search areas"), "x");
    expect(onSearchChange).toHaveBeenCalledWith("abcx");

    await user.selectOptions(screen.getByDisplayValue("10/page"), "20");
    expect(onSizeChange).toHaveBeenCalledWith(20);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(screen.getByText(/Page\s+1\s+of\s+3/)).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "switch-off" }));
    expect(onEdit).toHaveBeenCalledWith(area);
    expect(onDelete).toHaveBeenCalledWith(area);
    expect(onToggleStatus).toHaveBeenCalledWith(area);

    rerender(<PaginationControls page={0} size={10} total={5} onPageChange={onPageChange} onSizeChange={onSizeChange} />);
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    rerender(
      <ServiceableAreaTable
        items={[{ ...area, name: "Enabled", active: true }]}
        statusPendingId="1"
        deletePendingId="1"
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
      />,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
  });

  it("validates, normalizes, autosaves and resets the add-edit modal", async () => {
    const user = userEvent.setup();
    const duplicateCheck = vi.fn();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const editingItem = {
      id: "9",
      name: "Old Name",
      pincode: "123456",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      cityId: 2,
      zoneId: 4,
      polygonJson: "{\"type\":\"Polygon\"}",
      active: false,
    };

    const { rerender } = render(
      <AddEditServiceableAreaModal
        open
        editingItem={null}
        isSubmitting={false}
        duplicateCheck={duplicateCheck}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(await screen.findByText("Pincode must be exactly 6 digits")).toBeInTheDocument();

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Area A");
    await user.type(inputs[1], "654321");
    await user.type(inputs[2], "Noida");
    await user.type(inputs[3], "UP");
    await user.type(inputs[4], "0");
    await user.type(inputs[5], "12");
    await user.type(screen.getByPlaceholderText('Polygon JSON: {"type":"Polygon","coordinates":[...]}'), "  {json}  ");
    duplicateCheck.mockReturnValueOnce(true);

    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("This pincode already exists for the same city")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    duplicateCheck.mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith(
      {
        name: "Area A",
        pincode: "654321",
        city: "Noida",
        state: "UP",
        cityId: null,
        zoneId: 12,
        polygonJson: null,
        active: true,
      },
      undefined,
    );

    rerender(
      <AddEditServiceableAreaModal
        open
        editingItem={editingItem}
        isSubmitting={false}
        duplicateCheck={duplicateCheck}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const editInputs = screen.getAllByRole("textbox");
    expect(editInputs[0]).toHaveValue("Old Name");
    expect(editInputs[1]).toHaveValue("123456");
    expect(screen.getByRole("checkbox", { name: "Active" })).not.toBeChecked();

    fireEvent.change(editInputs[0], { target: { value: "Updated Name" } });
    act(() => {
      adminMocks.mapboxOnSave?.("  {saved-json} ");
    });
    expect(onSubmit).toHaveBeenCalledWith(
      {
        name: "Updated Name",
        pincode: "123456",
        city: "Delhi",
        state: "Delhi",
        cityId: 2,
        zoneId: 4,
        polygonJson: "{saved-json}",
        active: false,
      },
      "9",
    );

    act(() => {
      adminMocks.mapboxOnChange?.("{preview-json}");
    });
    expect(screen.getByTestId("polygon-preview")).toHaveTextContent("{preview-json}");

    await user.click(screen.getByText("close-modal"));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <AddEditServiceableAreaModal
        open
        editingItem={null}
        isSubmitting
        duplicateCheck={duplicateCheck}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("");
  });
});
