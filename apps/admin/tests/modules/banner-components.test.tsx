import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dataStateProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/components/admin", () => ({
  ImageUrlInput: ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (value: string) => void;
    label: string;
  }) => (
    <label>
      <span>{label}</span>
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  ),
  DataState: ({
    isLoading,
    isError,
    isEmpty,
    loadingText,
    errorText,
    emptyText,
    onRetry,
    children,
  }: {
    isLoading: boolean;
    isError: boolean;
    isEmpty: boolean;
    loadingText: string;
    errorText: string;
    emptyText: string;
    onRetry: () => void;
    children: React.ReactNode;
  }) => {
    mocks.dataStateProps.push({ isLoading, isError, isEmpty, loadingText, errorText, emptyText });
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) {
      return (
        <div>
          <span>{errorText}</span>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      );
    }
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  DataTable: ({
    rows,
    columns,
    rowKey,
  }: {
    rows: Array<Record<string, unknown>>;
    columns: Array<{
      key: string;
      header: string;
      render: (item: Record<string, unknown>) => React.ReactNode;
    }>;
    rowKey: (item: Record<string, unknown>) => string;
  }) => (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((column) => (
              <td key={column.key}>{column.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

import { BannerForm, defaultBannerFormValues } from "@/modules/banner/components/BannerForm";
import { BannerTable } from "@/modules/banner/components/BannerTable";

describe("banner components", () => {
  beforeEach(() => {
    mocks.dataStateProps.length = 0;
  });

  it("submits valid category banners and resets service redirects back to category", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <BannerForm
        defaultValues={{
          title: "Existing Banner",
          categoryId: "2",
          imageUrl: "https://cdn.lexho.test/existing.jpg",
          redirectType: "SERVICE",
          redirectValue: "",
          priority: 4,
          active: false,
        }}
        categories={[
          { id: "2", name: "Cleaning" },
          { id: "7", name: "Cooking" },
        ]}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByDisplayValue("Existing Banner")).toBeInTheDocument();
    expect(screen.getByLabelText("Redirect Type")).toHaveValue("CATEGORY");

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Fresh Banner");
    await user.selectOptions(screen.getByLabelText("Redirect Category"), "7");
    await user.clear(screen.getByLabelText("Banner Image"));
    await user.type(screen.getByLabelText("Banner Image"), "https://cdn.lexho.test/fresh.jpg");
    await user.clear(screen.getByLabelText("Priority"));
    await user.type(screen.getByLabelText("Priority"), "9");
    await user.click(screen.getByRole("button", { name: "Save Banner" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Fresh Banner",
        categoryId: "2",
        imageUrl: "https://cdn.lexho.test/fresh.jpg",
        redirectType: "CATEGORY",
        redirectValue: "7",
        priority: 9,
        active: false,
      }),
    );
  });

  it("validates required fields and external redirect urls, and shows submitting state", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const { rerender } = render(
      <BannerForm
        defaultValues={defaultBannerFormValues}
        categories={[{ id: "2", name: "Cleaning" }]}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save Banner" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Image is required")).toBeInTheDocument();
    expect(screen.getByText("Redirect target is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    const titleInput = screen.getAllByRole("textbox")[0];
    const redirectTypeSelect = screen.getAllByRole("combobox")[1];
    await user.selectOptions(redirectTypeSelect, "EXTERNAL");
    await user.clear(titleInput);
    await user.type(titleInput, "Go");
    await user.clear(screen.getByLabelText("Banner Image"));
    await user.type(screen.getByLabelText("Banner Image"), "https://cdn.lexho.test/go.jpg");
    const redirectUrlInput = screen.getAllByRole("textbox")[2];
    await user.type(redirectUrlInput, "not-a-url");
    fireEvent.click(screen.getByRole("button", { name: "Save Banner" }));

    expect(await screen.findByText("Enter a valid URL for external redirect")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <BannerForm
        defaultValues={defaultBannerFormValues}
        categories={[{ id: "2", name: "Cleaning" }]}
        isSubmitting={true}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });

  it("resets form values when the provided defaults change", async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <BannerForm
        defaultValues={{
          ...defaultBannerFormValues,
          title: "Before",
          imageUrl: "https://cdn.lexho.test/before.jpg",
        }}
        categories={[{ id: "1", name: "Home" }]}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByDisplayValue("Before")).toBeInTheDocument();

    rerender(
      <BannerForm
        defaultValues={{
          ...defaultBannerFormValues,
          title: "After",
          imageUrl: "https://cdn.lexho.test/after.jpg",
          redirectType: "EXTERNAL",
          redirectValue: "https://example.com",
        }}
        categories={[{ id: "1", name: "Home" }]}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("After")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://cdn.lexho.test/after.jpg")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://example.com")).toBeInTheDocument();
    });
  });

  it("validates negative priority values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <BannerForm
        defaultValues={{
          title: "Priority Banner",
          categoryId: "",
          imageUrl: "https://cdn.lexho.test/priority.jpg",
          redirectType: "EXTERNAL",
          redirectValue: "https://example.com",
          priority: 0,
          active: true,
        }}
        categories={[]}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    const priorityInput = screen.getByRole("spinbutton");
    await user.clear(priorityInput);
    await user.type(priorityInput, "-1");
    await user.click(screen.getByRole("button", { name: "Save Banner" }));

    expect(await screen.findByText("Priority must be 0 or greater")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders table rows, fallbacks, and action callbacks", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const rows = [
      {
        id: "1",
        title: "Hero Banner",
        categoryId: "2",
        categoryName: "",
        imageUrl: "",
        redirectType: "CATEGORY" as const,
        redirectValue: "2",
        status: "INACTIVE" as const,
        priority: 1,
        active: false,
      },
      {
        id: "2",
        title: "Promo Banner",
        categoryId: "3",
        categoryName: "Cooking",
        imageUrl: "https://cdn.lexho.test/promo.jpg",
        redirectType: "EXTERNAL" as const,
        redirectValue: "https://example.com",
        status: "ACTIVE" as const,
        priority: 2,
        active: true,
      },
    ];

    render(
      <BannerTable
        rows={rows}
        isLoading={false}
        isError={false}
        onRetry={onRetry}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
    );

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Cooking")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByAltText("Promo Banner")).toHaveAttribute("src", "https://cdn.lexho.test/promo.jpg");
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    const upButtons = screen.getAllByRole("button", { name: "Up" });
    const downButtons = screen.getAllByRole("button", { name: "Down" });
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });

    await user.click(editButtons[0]);
    await user.click(upButtons[1]);
    await user.click(downButtons[0]);
    await user.click(deleteButtons[1]);

    expect(onEdit).toHaveBeenCalledWith(rows[0]);
    expect(onMoveUp).toHaveBeenCalledWith(rows[1]);
    expect(onMoveDown).toHaveBeenCalledWith(rows[0]);
    expect(onDelete).toHaveBeenCalledWith(rows[1]);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("shows loading, error, and empty states through DataState", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    const { rerender } = render(
      <BannerTable
        rows={[]}
        isLoading={true}
        isError={false}
        onRetry={onRetry}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />,
    );

    expect(screen.getByText("Loading banners...")).toBeInTheDocument();

    rerender(
      <BannerTable
        rows={[]}
        isLoading={false}
        isError={true}
        onRetry={onRetry}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />,
    );

    expect(screen.getByText("Unable to load banners")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <BannerTable
        rows={[]}
        isLoading={false}
        isError={false}
        onRetry={onRetry}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />,
    );

    expect(screen.getByText("No banners found")).toBeInTheDocument();
  });
});
