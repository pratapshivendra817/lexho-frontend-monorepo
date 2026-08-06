import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  extractApiError: vi.fn(),
  createAdminCookFamilySize: vi.fn(),
  deleteAdminCookFamilySize: vi.fn(),
  getAdminCookFamilySizes: vi.fn(),
  updateAdminCookFamilySize: vi.fn(),
  updateAdminCookFamilySizeStatus: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/components/admin", () => ({
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
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  DataTable: ({
    rows,
    columns,
  }: {
    rows: Array<Record<string, unknown>>;
    columns: Array<{ key: string; header: string; render: (row: any) => React.ReactNode }>;
  }) => (
    <table>
      <thead>
        <tr>{columns.map((column) => <th key={column.key}>{column.header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={String(row.familySizeId ?? index)}>
            {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  ModalFormLayout: ({
    open,
    title,
    onClose,
    submitLabel,
    isSubmitting,
    children,
  }: {
    open: boolean;
    title: string;
    onClose: () => void;
    submitLabel: string;
    isSubmitting: boolean;
    children: React.ReactNode;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        <button onClick={onClose}>close-modal</button>
        {children}
        <button form="cook-family-size-form" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </div>
    ) : null,
  ConfirmDialog: ({
    open,
    title,
    description,
    confirmLabel,
    isLoading,
    onClose,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    isLoading: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={onClose}>cancel-delete</button>
        <button onClick={onConfirm} disabled={isLoading}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
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

vi.mock("@/features/cook-family-sizes/api/cookFamilySizesApi", () => ({
  createAdminCookFamilySize: mocks.createAdminCookFamilySize,
  deleteAdminCookFamilySize: mocks.deleteAdminCookFamilySize,
  getAdminCookFamilySizes: mocks.getAdminCookFamilySizes,
  updateAdminCookFamilySize: mocks.updateAdminCookFamilySize,
  updateAdminCookFamilySizeStatus: mocks.updateAdminCookFamilySizeStatus,
}));

import CookFamilySizesPage from "@/features/cook-family-sizes/pages/CookFamilySizesPage";

const rows = [
  {
    familySizeId: 1,
    familySize: "SMALL",
    familySizeLabel: "1-2 Members",
    active: true,
    displayOrder: 1,
  },
  {
    familySizeId: 2,
    familySize: "MEDIUM",
    familySizeLabel: "3-5 Members",
    active: false,
    displayOrder: 2,
  },
];

type MutationOptions = {
  mutationFn: (payload: any) => unknown;
  onSuccess?: (data?: unknown, payload?: unknown) => unknown;
  onError?: (error: unknown) => unknown;
};

describe("CookFamilySizesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.extractApiError.mockReturnValue("mapped error");
    mocks.useQuery.mockReturnValue({
      data: rows,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess, onError }: MutationOptions) => ({
      isPending: false,
      mutate: async (payload: unknown) => {
        try {
          const result = await mutationFn(payload);
          await onSuccess?.(result, payload);
        } catch (error) {
          onError?.(error);
        }
      },
    }));
  });

  it("renders rows, creates a family size, toggles status, edits, deletes, and closes dialogs", async () => {
    const user = userEvent.setup();
    mocks.createAdminCookFamilySize.mockResolvedValue({});
    mocks.updateAdminCookFamilySizeStatus.mockResolvedValue({});
    mocks.updateAdminCookFamilySize.mockResolvedValue({});
    mocks.deleteAdminCookFamilySize.mockResolvedValue(2);

    render(<CookFamilySizesPage />);

    expect(screen.getByText("Cook Family Sizes")).toBeInTheDocument();
    expect(screen.getByText("1-2 Members")).toBeInTheDocument();
    expect(screen.getByText("3-5 Members")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Create Family Size" }));
    expect(screen.getByText("Create Cook Family Size")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();

    const createInputs = screen.getAllByRole("textbox");
    await user.type(createInputs[0], " Family Pack ");
    await user.click(screen.getByRole("checkbox", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mocks.createAdminCookFamilySize).toHaveBeenCalledWith({
        familySize: "SMALL",
        familySizeLabel: "Family Pack",
        active: false,
        displayOrder: 3,
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Cook family size created");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-cook-family-sizes"] });
    expect(screen.queryByText("Create Cook Family Size")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Active" }));
    expect(mocks.updateAdminCookFamilySizeStatus).toHaveBeenCalledWith(1, false);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Status updated");

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    expect(screen.getByText("Edit Cook Family Size")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MEDIUM")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3-5 Members")).toBeInTheDocument();
    const editInputs = screen.getAllByRole("textbox");
    await user.clear(editInputs[0]);
    await user.type(editInputs[0], " 5-7 Members ");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mocks.updateAdminCookFamilySize).toHaveBeenCalledWith(2, {
        familySize: "MEDIUM",
        familySizeLabel: "5-7 Members",
        active: false,
        displayOrder: 2,
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Cook family size updated");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(screen.getByText("Delete cook family size?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "cancel-delete" }));
    expect(screen.queryByText("Delete cook family size?")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Delete" })[1]);
    const deleteDialog = screen.getByText("Delete cook family size?").closest("div")!;
    await user.click(within(deleteDialog).getByRole("button", { name: "Delete" }));
    expect(mocks.deleteAdminCookFamilySize).toHaveBeenCalledWith(2);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Cook family size deactivated");

    await user.click(screen.getByRole("button", { name: "+ Create Family Size" }));
    await user.click(screen.getByRole("button", { name: "close-modal" }));
    expect(screen.queryByText("Create Cook Family Size")).not.toBeInTheDocument();
  });

  it("covers loading, error retry, empty states, validation failures, and mutation errors", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });

    const loadingView = render(<CookFamilySizesPage />);
    expect(screen.getByText("Loading cook family sizes...")).toBeInTheDocument();

    loadingView.unmount();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    const errorView = render(<CookFamilySizesPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load cook family sizes" }));
    expect(refetch).toHaveBeenCalled();
    errorView.unmount();
  });

  it("shows empty state and validation errors before mutation calls", async () => {
    const user = userEvent.setup();
    mocks.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const emptyView = render(<CookFamilySizesPage />);
    expect(screen.getByText("No cook family sizes found")).toBeInTheDocument();

    emptyView.unmount();
    mocks.useQuery.mockReturnValue({
      data: rows,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<CookFamilySizesPage />);

    await user.click(screen.getByRole("button", { name: "+ Create Family Size" }));
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "SMALL");
    const textInput = screen.getByPlaceholderText("3-5 Members");
    fireEvent.change(textInput, { target: { value: "   " } });
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(mocks.toastError).toHaveBeenLastCalledWith("Family size label is required");
    expect(mocks.createAdminCookFamilySize).not.toHaveBeenCalled();
  });

  it("maps api errors for create, update, status, and delete mutations", async () => {
    const user = userEvent.setup();
    const error = { response: { status: 500 } };
    mocks.createAdminCookFamilySize.mockRejectedValue(error);
    mocks.updateAdminCookFamilySize.mockRejectedValue(error);
    mocks.updateAdminCookFamilySizeStatus.mockRejectedValue(error);
    mocks.deleteAdminCookFamilySize.mockRejectedValue(error);

    render(<CookFamilySizesPage />);

    await user.click(screen.getByRole("button", { name: "+ Create Family Size" }));
    await user.type(screen.getAllByRole("textbox")[0], "Edge label");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(mocks.extractApiError).toHaveBeenCalledWith(error, "Unable to create cook family size");
    });

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => {
      expect(mocks.extractApiError).toHaveBeenCalledWith(error, "Unable to update cook family size");
    });

    await user.click(screen.getByRole("button", { name: "Active" }));
    await waitFor(() => {
      expect(mocks.extractApiError).toHaveBeenCalledWith(error, "Unable to update status");
    });

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    const deleteDialog = screen.getByText("Delete cook family size?").closest("div")!;
    await user.click(within(deleteDialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(mocks.extractApiError).toHaveBeenCalledWith(error, "Unable to delete cook family size");
    });
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");
  });
});
