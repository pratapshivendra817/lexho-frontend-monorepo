import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useUsersQuery: vi.fn(),
  useUserMutations: vi.fn(),
  useDebounce: vi.fn(),
  navigate: vi.fn(),
  extractApiError: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  blockMutate: vi.fn(),
  unblockMutate: vi.fn(),
  deleteMutate: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/features/users/hooks/useUsers", () => ({
  useUsersQuery: mocks.useUsersQuery,
  useUserMutations: mocks.useUserMutations,
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: mocks.useDebounce,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.success,
    error: mocks.error,
  },
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
  }: any) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  Pagination: ({ page, onPageChange }: any) => (
    <div>
      <span>page-{page}</span>
      <button onClick={() => onPageChange(page + 1)}>next-page</button>
    </div>
  ),
  Skeleton: ({ className }: { className: string }) => <div>{className}</div>,
  ConfirmDialog: ({ open, title, onConfirm, onClose, description }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onConfirm}>confirm-dialog</button>
        <button onClick={onClose}>close-dialog</button>
      </div>
    ) : null,
}));

vi.mock("@/features/users/components/UsersFilters", () => ({
  UsersFilters: ({
    onSearchChange,
    onRoleChange,
    onStatusChange,
    onCityChange,
    onAddUser,
    onReset,
  }: any) => (
    <div>
      <button onClick={() => onSearchChange("riya")}>search-users</button>
      <button onClick={() => onRoleChange("ADMIN")}>role-users</button>
      <button onClick={() => onStatusChange("BLOCKED")}>status-users</button>
      <button onClick={() => onCityChange("Delhi")}>city-users</button>
      <button onClick={onAddUser}>add-user</button>
      <button onClick={onReset}>reset-users</button>
    </div>
  ),
}));

vi.mock("@/features/users/components/UsersTable", () => ({
  UsersTable: ({ rows, onView, onEdit, onBlockToggle, onDelete }: any) => (
    <div>
      {rows.map((row: any) => (
        <div key={row.id}>
          <span>{row.name}</span>
          <button onClick={() => onView(row)}>view-user</button>
          <button onClick={() => onEdit(row)}>edit-user</button>
          <button onClick={() => onBlockToggle(row)}>{row.blocked ? "toggle-unblock" : "toggle-block"}</button>
          <button onClick={() => onDelete(row)}>delete-user</button>
        </div>
      ))}
    </div>
  ),
}));

import UsersPage from "@/features/users/pages/UsersPage";

describe("UsersPage branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDebounce.mockImplementation((value) => value);
    mocks.extractApiError.mockImplementation((_error, fallback) => fallback);
    mocks.useUsersQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "usr-1",
            name: "Riya",
            email: "riya@example.com",
            phone: "9999999999",
            role: "CUSTOMER",
            status: "ACTIVE",
            city: "Indore",
            blocked: false,
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    mocks.useUserMutations.mockReturnValue({
      blockUserMutation: { isPending: false, mutate: mocks.blockMutate.mockImplementation((_id, options) => options?.onSuccess?.()) },
      unblockUserMutation: { isPending: false, mutate: mocks.unblockMutate.mockImplementation((_id, options) => options?.onSuccess?.()) },
      deleteUserMutation: { isPending: false, mutate: mocks.deleteMutate.mockImplementation((_id, options) => options?.onSuccess?.()) },
    });
  });

  it("covers loading, error, empty, fetching, filters, navigation, and mutation branches", async () => {
    mocks.useUsersQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const loadingView = render(<UsersPage />);
    expect(screen.getByText("Loading users...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.useUsersQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const errorView = render(<UsersPage />);
    fireEvent.click(screen.getByText("Failed to load users"));
    expect(mocks.refetch).toHaveBeenCalled();
    errorView.unmount();

    mocks.useUsersQuery.mockReturnValueOnce({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const emptyView = render(<UsersPage />);
    expect(screen.getByText("No users found")).toBeInTheDocument();
    emptyView.unmount();

    mocks.useUsersQuery.mockReturnValueOnce({
      data: {
        content: [
          {
            id: "usr-1",
            name: "Riya",
            email: "riya@example.com",
            phone: "9999999999",
            role: "CUSTOMER",
            status: "ACTIVE",
            city: "Indore",
            blocked: false,
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      isFetching: true,
      refetch: mocks.refetch,
    });
    mocks.useUsersQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "usr-1",
            name: "Riya",
            email: "riya@example.com",
            phone: "9999999999",
            role: "CUSTOMER",
            status: "ACTIVE",
            city: "Indore",
            blocked: false,
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      isFetching: true,
      refetch: mocks.refetch,
    });
    mocks.useUserMutations.mockReturnValue({
      blockUserMutation: { isPending: false, mutate: mocks.blockMutate },
      unblockUserMutation: { isPending: true, mutate: mocks.unblockMutate.mockImplementation((_id, options) => options?.onError?.(new Error("unblock fail"))) },
      deleteUserMutation: { isPending: false, mutate: mocks.deleteMutate.mockImplementation((_id, options) => options?.onError?.(new Error("delete fail"))) },
    });
    mocks.blockMutate.mockImplementation((_id, options) => options?.onError?.(new Error("block fail")));
    render(<UsersPage />);

    expect(screen.getByText("1 users · No active filters")).toBeInTheDocument();
    expect(screen.getAllByText("h-12 w-full")).toHaveLength(3);

    fireEvent.click(screen.getByText("search-users"));
    fireEvent.click(screen.getByText("role-users"));
    fireEvent.click(screen.getByText("status-users"));
    fireEvent.click(screen.getByText("city-users"));
    fireEvent.click(screen.getByText("add-user"));
    expect(mocks.navigate).toHaveBeenCalledWith("/users/new");

    fireEvent.click(screen.getByText("reset-users"));
    fireEvent.click(screen.getByText("view-user"));
    expect(mocks.navigate).toHaveBeenCalledWith("/users/usr-1");
    fireEvent.click(screen.getByText("edit-user"));
    expect(mocks.navigate).toHaveBeenCalledWith("/users/usr-1/edit");

    fireEvent.click(screen.getByText("toggle-block"));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Failed to block user"));

    fireEvent.click(screen.getByText("delete-user"));
    fireEvent.click(screen.getByText("confirm-dialog"));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Failed to delete user"));
    fireEvent.click(screen.getByText("close-dialog"));
    fireEvent.click(screen.getByText("next-page"));
    expect(screen.getByText("page-2")).toBeInTheDocument();
  });
});
