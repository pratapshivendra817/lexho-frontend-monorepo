import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  getCustomerProfilesAdmin: vi.fn(),
  getCustomerDeleteRequestsAdmin: vi.fn(),
  resolveCustomerDeleteRequestAdmin: vi.fn(),
  updateCustomerProfileAdmin: vi.fn(),
  updateCustomerStatusAdmin: vi.fn(),
  getProfileContentAdmin: vi.fn(),
  updateProfileContentAdmin: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/components/admin", () => ({
  SegmentedTabs: ({
    items,
    value,
    onChange,
  }: {
    items: Array<{ label: string; value: string }>;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
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
          <tr key={String(row.id ?? index)}>
            {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  Modal: ({
    open,
    title,
    onClose,
    children,
  }: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        <button onClick={onClose}>close-modal</button>
        {children}
      </div>
    ) : null,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/features/customer-profile-control/api/customerProfileControlApi", () => ({
  getCustomerProfilesAdmin: mocks.getCustomerProfilesAdmin,
  getCustomerDeleteRequestsAdmin: mocks.getCustomerDeleteRequestsAdmin,
  resolveCustomerDeleteRequestAdmin: mocks.resolveCustomerDeleteRequestAdmin,
  updateCustomerProfileAdmin: mocks.updateCustomerProfileAdmin,
  updateCustomerStatusAdmin: mocks.updateCustomerStatusAdmin,
  getProfileContentAdmin: mocks.getProfileContentAdmin,
  updateProfileContentAdmin: mocks.updateProfileContentAdmin,
}));

vi.mock("@/features/users/pages/UsersPage", () => ({
  default: () => <div>users-page</div>,
}));

vi.mock("@/features/sections/pages/SectionsPage", () => ({
  default: () => <div>sections-page</div>,
}));

import CustomerProfilesControlPage from "@/features/customer-profile-control/pages/CustomerProfilesControlPage";
import ProfileContentControlPage from "@/features/customer-profile-control/pages/ProfileContentControlPage";

const profileRow = {
  id: "c1",
  fullName: "Alex Doe",
  mobile: "999999",
  phoneNumber: "",
  email: "alex@example.com",
  gender: "MALE" as const,
  addressCount: 2,
  active: true,
  profileEditLocked: false,
  emailVerified: false,
  phoneVerified: true,
  profileImageApproved: true,
  adminNotes: "",
};

const stableDeleteRequests = [{ id: "r1", customerId: "c1", customerName: "Alex Doe", reason: "cleanup", resolved: false }];
const stableProfileContent = {
  aboutUs: "About us content",
  termsOfService: "Terms of service content",
  privacyPolicy: "Privacy policy content",
};

describe("customer profile control pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      const key = options.queryKey[0];
      if (key === "customer-profile-control") {
        return { data: [profileRow], isLoading: false, isError: false, refetch: vi.fn() };
      }
      if (key === "customer-delete-requests") {
        return {
          data: stableDeleteRequests,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      return {
        data: stableProfileContent,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
    });
    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess, onError }) => ({
      isPending: false,
      mutate: async (payload: unknown, overrides?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
        try {
          const result = await mutationFn(payload);
          await onSuccess?.(result, payload);
          overrides?.onSuccess?.();
        } catch (error) {
          onError?.(error);
          overrides?.onError?.(error);
        }
      },
    }));
  });

  it("renders customer profiles, updates governance/status, resolves requests, and switches modes", async () => {
    const user = userEvent.setup();
    render(<CustomerProfilesControlPage />);

    expect(screen.getByText("Customer Profile Governance")).toBeInTheDocument();
    expect(screen.getAllByText("Alex Doe")).toHaveLength(2);
    expect(screen.getByText("cleanup")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search by name, phone, email"), "al");
    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Customer status updated");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["customer-profile-control"] });

    await user.click(screen.getByRole("button", { name: "Governance" }));
    expect(screen.getByText("Customer Governance Update")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Profile Edit Locked"));
    await user.type(screen.getAllByRole("textbox").at(-1)!, "governed");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Customer governance updated");
    });

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Delete request approved");

    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Delete request rejected");

    await user.click(screen.getByRole("button", { name: "Users" }));
    expect(screen.getByText("users-page")).toBeInTheDocument();
  });

  it("covers loading, error, empty requests, modal close, and mutation failures", async () => {
    const user = userEvent.setup();
    const refetchProfiles = vi.fn();
    mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      const key = options.queryKey[0];
      if (key === "customer-profile-control") {
        return { data: undefined, isLoading: true, isError: false, refetch: refetchProfiles };
      }
      return { data: [], isLoading: true, isError: false, refetch: vi.fn() };
    });

    const { rerender, unmount } = render(<CustomerProfilesControlPage />);
    expect(screen.getByText("Loading customer profiles...")).toBeInTheDocument();

    mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      const key = options.queryKey[0];
      if (key === "customer-profile-control") {
        return { data: undefined, isLoading: false, isError: true, refetch: refetchProfiles };
      }
      return { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    });
    mocks.useMutation.mockImplementation(({ onError }) => ({
      isPending: false,
      mutate: (_payload: unknown, overrides?: { onError?: (error: unknown) => void }) => {
        const error = new Error("failed");
        onError?.(error);
        overrides?.onError?.(error);
      },
    }));
    rerender(<CustomerProfilesControlPage />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetchProfiles).toHaveBeenCalled();

    mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      const key = options.queryKey[0];
      if (key === "customer-profile-control") {
        return { data: [profileRow], isLoading: false, isError: false, refetch: vi.fn() };
      }
      return { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    });
    rerender(<CustomerProfilesControlPage />);
    expect(screen.getByText("No pending requests.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Governance" }));
    await user.click(screen.getByText("close-modal"));
    expect(screen.queryByText("Customer Governance Update")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to update status");
    unmount();
  });

  it("renders profile content page states, saves, resets, retries, and switches to sections", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    const { rerender, unmount } = render(<ProfileContentControlPage />);

    expect(screen.getByText("Profile Content Manager")).toBeInTheDocument();
    const [aboutUs] = screen.getAllByRole("textbox");
    expect(aboutUs).toHaveValue("About us content");

    await user.clear(aboutUs);
    await user.type(aboutUs, "Updated about us content");
    await user.click(screen.getByRole("button", { name: "Save Content" }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Profile content updated");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("About us content");

    await user.click(screen.getByRole("button", { name: "Sections" }));
    expect(screen.getByText("sections-page")).toBeInTheDocument();

    unmount();
    mocks.useQuery.mockImplementation(() => ({ data: undefined, isLoading: true, isError: false, refetch }));
    const loadingView = render(<ProfileContentControlPage />);
    expect(screen.getByText("Loading content...")).toBeInTheDocument();

    loadingView.unmount();
    mocks.useQuery.mockImplementation(() => ({ data: undefined, isLoading: false, isError: true, refetch }));
    const errorView = render(<ProfileContentControlPage />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();

    mocks.useQuery.mockReturnValue({
      data: stableProfileContent,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useMutation.mockImplementation(({ onError }) => ({
      isPending: false,
      mutate: () => onError?.(new Error("save failed")),
    }));
    errorView.rerender(<ProfileContentControlPage />);
    await user.click(screen.getByRole("button", { name: "Save Content" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to save content");
  });
});
