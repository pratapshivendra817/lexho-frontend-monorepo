import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClientMock } from "./featureTestUtils";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  navigate: vi.fn(),
  useParams: vi.fn(),
  extractApiError: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.useParams(),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span>arrow-left</span>,
  Ban: () => <span>ban-icon</span>,
  Pencil: () => <span>pencil-icon</span>,
  ShieldCheck: () => <span>shield-icon</span>,
  Trash2: () => <span>trash-icon</span>,
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
  ModalFormLayout: ({ open, title, children, onClose }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        <button onClick={onClose}>close-modal</button>
        {children}
      </div>
    ) : null,
  ConfirmDialog: ({ open, title, description, onConfirm, onClose }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onConfirm}>confirm-dialog</button>
        <button onClick={onClose}>close-dialog</button>
      </div>
    ) : null,
}));

vi.mock("@/features/users/components", () => ({
  UserForm: ({
    initialValues,
    onSubmit,
    submitLabel,
  }: {
    initialValues?: any;
    onSubmit: (values: any) => void;
    submitLabel: string;
  }) => (
    <div>
      <span>form-label-{submitLabel}</span>
      <span>initial-status-{initialValues?.status ?? "empty"}</span>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            name: "Neha",
            email: "neha@example.com",
            phone: "9999999999",
            role: "CUSTOMER",
            city: "Indore",
            status: "ACTIVE",
          })
        }
      >
        submit-user-form
      </button>
    </div>
  ),
  UserStatusBadge: ({ status }: { status: string }) => <span>status-{status}</span>,
}));

import { useUserDetailsQuery, useUserMutations, useUsersQuery } from "@/features/users/hooks/useUsers";
import CreateUserPage from "@/features/users/pages/CreateUserPage";
import EditUserPage from "@/features/users/pages/EditUserPage";
import UserDetailsPage from "@/features/users/pages/UserDetailsPage";

function mockUserMutationSequence(...mutations: Array<(callbacks?: any) => void>) {
  let callIndex = 0;
  mocks.useMutation.mockImplementation((options) => {
    const current = mutations[callIndex % mutations.length] ?? (() => {});
    callIndex += 1;
    return {
      ...options,
      isPending: false,
      mutate: (_variables: any, callbacks?: any) => current(callbacks),
    };
  });
}

describe("users hooks and pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockImplementation((options) => options);
    mocks.useMutation.mockImplementation((options) => options);
    mocks.useQueryClient.mockReturnValue(createQueryClientMock());
    mocks.useParams.mockReturnValue({ id: "user-1" });
    mocks.extractApiError.mockImplementation((_error, fallback) => fallback);
  });

  it("configures user queries and invalidates caches for every mutation", async () => {
    const queryClient = createQueryClientMock();
    mocks.useQueryClient.mockReturnValue(queryClient);

    const listQuery = useUsersQuery({ page: 2, limit: 10, city: "Indore" });
    expect(listQuery.queryKey).toEqual(["admin-users", { page: 2, limit: 10, city: "Indore" }]);
    expect(listQuery.placeholderData?.("prev")).toBe("prev");

    const detailsQuery = useUserDetailsQuery(undefined);
    expect(detailsQuery.enabled).toBe(false);

    const mutations = useUserMutations();
    await mutations.createUserMutation.onSuccess?.(undefined, undefined as never, undefined);
    await mutations.blockUserMutation.onSuccess?.(undefined, undefined as never, undefined);
    await mutations.unblockUserMutation.onSuccess?.(undefined, undefined as never, undefined);
    await mutations.deleteUserMutation.onSuccess?.(undefined, undefined as never, undefined);
    await mutations.updateUserMutation.onSuccess?.(undefined, { id: "user-1", payload: {} as never }, undefined);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-users"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-user-details", "user-1"] });
  });

  it("handles create page success and error states", async () => {
    mockUserMutationSequence(
      (callbacks) => callbacks?.onSuccess?.(),
      () => {},
      () => {},
      () => {},
      () => {},
    );

    render(<CreateUserPage />);
    fireEvent.click(screen.getByText("submit-user-form"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("User created"));
    expect(mocks.navigate).toHaveBeenCalledWith("/users", { replace: true });

    mockUserMutationSequence(
      (callbacks) => callbacks?.onError?.(new Error("create fail")),
      () => {},
      () => {},
      () => {},
      () => {},
    );
    render(<CreateUserPage />);
    fireEvent.click(screen.getAllByText("submit-user-form")[1]!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Unable to create user"));
  });

  it("covers edit page loading, empty, success, error, deleted-status mapping, and close navigation", async () => {
    mocks.useQuery.mockImplementationOnce(() => ({
      data: null,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    }));
    mockUserMutationSequence(() => {}, () => {}, () => {}, () => {}, () => {});
    const loadingView = render(<EditUserPage />);
    expect(screen.getByText("Loading user details...")).toBeInTheDocument();
    loadingView.unmount();

    const refetch = vi.fn();
    mocks.useQuery.mockImplementationOnce(() => ({
      data: null,
      isLoading: false,
      isError: true,
      refetch,
    }));
    mockUserMutationSequence(() => {}, () => {}, () => {}, () => {}, () => {});
    const errorView = render(<EditUserPage />);
    fireEvent.click(screen.getByText("Failed to load user details"));
    expect(refetch).toHaveBeenCalled();
    errorView.unmount();

    mocks.useQuery.mockImplementationOnce(() => ({
      data: {
        id: "user-1",
        name: "Riya",
        email: "riya@example.com",
        phone: "8888888888",
        role: "CUSTOMER",
        city: "Delhi",
        status: "DELETED",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }));
    mockUserMutationSequence(
      () => {},
      (callbacks) => callbacks?.onSuccess?.(),
      () => {},
      () => {},
      () => {},
    );
    render(<EditUserPage />);
    expect(screen.getByText("initial-status-INACTIVE")).toBeInTheDocument();
    fireEvent.click(screen.getByText("submit-user-form"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("User updated"));
    expect(mocks.navigate).toHaveBeenCalledWith("/users/user-1", { replace: true });
    fireEvent.click(screen.getByText("close-modal"));
    expect(mocks.navigate).toHaveBeenCalledWith("/users/user-1", { replace: true });

    mocks.useQuery.mockImplementationOnce(() => ({
      data: {
        id: "user-1",
        name: "Riya",
        email: "riya@example.com",
        phone: "8888888888",
        role: "CUSTOMER",
        city: "Delhi",
        status: "ACTIVE",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }));
    mockUserMutationSequence(
      () => {},
      (callbacks) => callbacks?.onError?.(new Error("update fail")),
      () => {},
      () => {},
      () => {},
    );
    render(<EditUserPage />);
    fireEvent.click(screen.getAllByText("submit-user-form")[1]!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Unable to update user"));
  });

  it("covers user details states plus block, unblock, delete, and navigation branches", async () => {
    const detailRefetch = vi.fn();

    mocks.useQuery.mockImplementationOnce(() => ({
      data: null,
      isLoading: true,
      isError: false,
      refetch: detailRefetch,
    }));
    mockUserMutationSequence(() => {}, () => {}, () => {}, () => {}, () => {});
    const loadingView = render(<UserDetailsPage />);
    expect(screen.getByText("Loading user details...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.useQuery.mockImplementationOnce(() => ({
      data: null,
      isLoading: false,
      isError: true,
      refetch: detailRefetch,
    }));
    mockUserMutationSequence(() => {}, () => {}, () => {}, () => {}, () => {});
    const errorView = render(<UserDetailsPage />);
    fireEvent.click(screen.getByText("Failed to load user details"));
    expect(detailRefetch).toHaveBeenCalled();
    errorView.unmount();

    mocks.useQuery.mockImplementation(() => ({
      data: {
        id: "user-1",
        name: "Sana",
        email: "",
        phone: "",
        role: "PARTNER",
        city: "",
        status: "ACTIVE",
        blocked: false,
        createdAt: "",
      },
      isLoading: false,
      isError: false,
      refetch: detailRefetch,
    }));
    mockUserMutationSequence(
      () => {},
      () => {},
      (callbacks) => callbacks?.onSuccess?.(),
      () => {},
      (callbacks) => callbacks?.onSuccess?.(),
    );
    render(<UserDetailsPage />);
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Edit"));
    expect(mocks.navigate).toHaveBeenCalledWith("/users/user-1/edit");
    fireEvent.click(screen.getByText("Block"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("User blocked"));
    expect(detailRefetch).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("confirm-dialog"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("User deleted"));
    expect(mocks.navigate).toHaveBeenCalledWith("/users", { replace: true });

    mocks.useQuery.mockImplementation(() => ({
      data: {
        id: "user-2",
        name: "Blocked User",
        email: "blocked@example.com",
        phone: "9999999999",
        role: "CUSTOMER",
        city: "Indore",
        status: "BLOCKED",
        blocked: true,
        createdAt: "2026-07-16",
      },
      isLoading: false,
      isError: false,
      refetch: detailRefetch,
    }));
    mockUserMutationSequence(
      () => {},
      () => {},
      () => {},
      (callbacks) => callbacks?.onError?.(new Error("unblock fail")),
      (callbacks) => callbacks?.onError?.(new Error("delete fail")),
    );
    render(<UserDetailsPage />);
    fireEvent.click(screen.getAllByText("Unblock")[0]!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Unable to unblock user"));
    fireEvent.click(screen.getAllByText("Delete")[1]!);
    fireEvent.click(screen.getAllByText("confirm-dialog")[1]!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Unable to delete user"));
    fireEvent.click(screen.getAllByText("close-dialog").at(-1)!);
  });
});
