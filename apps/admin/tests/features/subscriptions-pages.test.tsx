import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  useSearchParams: vi.fn(),
  useParams: vi.fn(),
  useDebounce: vi.fn(),
  getAdminSubscriptions: vi.fn(),
  getServices: vi.fn(),
  getAdminSubscriptionChangeRequests: vi.fn(),
  reviewAdminSubscriptionChangeRequest: vi.fn(),
  extractApiError: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: mocks.useDebounce,
}));

vi.mock("@/services/lexhoAdminApi", () => ({
  getServices: mocks.getServices,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("react-hot-toast", () => ({
  default: { success: mocks.success, error: mocks.error },
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useSearchParams: mocks.useSearchParams,
  useParams: mocks.useParams,
}));

vi.mock("@/components/admin", () => ({
  DataState: ({ isLoading, isError, isEmpty, loadingText, errorText, emptyText, onRetry, children }: any) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  DataTable: ({ rows, columns }: any) => (
    <div>
      {rows.map((row: any) => (
        <div key={row.id}>
          {columns.map((column: any) => (
            <div key={column.key}>{column.render ? column.render(row) : row[column.key]}</div>
          ))}
        </div>
      ))}
    </div>
  ),
  Pagination: ({ page, onPageChange }: any) => <button onClick={() => onPageChange(page + 1)}>page-{page}</button>,
  ModalFormLayout: ({ open, title, children, submitLabel, isSubmitting, onClose }: any) =>
    open ? <div><h3>{title}</h3>{children}<button type="submit" form={children.props.id}>{isSubmitting ? "Submitting" : submitLabel}</button><button onClick={onClose}>Close</button></div> : null,
  ConfirmDialog: ({ open, title, description, onConfirm }: any) =>
    open ? <div><h3>{title}</h3><p>{description}</p><button onClick={onConfirm}>confirm-subscription</button></div> : null,
}));

vi.mock("@/features/subscriptions/api/subscriptionsApi", () => ({
  getAdminSubscriptions: mocks.getAdminSubscriptions,
  getAdminSubscriptionDetail: vi.fn(),
  getAdminSubscriptionCalendar: vi.fn(),
  getAdminSubscriptionAssignment: vi.fn(),
  getAdminSubscriptionChangeRequests: mocks.getAdminSubscriptionChangeRequests,
  reviewAdminSubscriptionChangeRequest: mocks.reviewAdminSubscriptionChangeRequest,
  updateAdminSubscriptionStatus: vi.fn(),
  updateAdminSubscriptionVisitStatus: vi.fn(),
  assignAdminSubscriptionPartner: vi.fn(),
  replaceAdminSubscriptionPartner: vi.fn(),
  assignAdminSubscriptionVisitPartner: vi.fn(),
}));

vi.mock("@/features/subscriptions/api/subscriptionPricingApi", () => ({
  getAdminSubscriptionPricing: vi.fn(),
  createAdminSubscriptionPricing: vi.fn(),
  updateAdminSubscriptionPricing: vi.fn(),
  deleteAdminSubscriptionPricing: vi.fn(),
  getAdminCookSubscriptionPricing: vi.fn(),
  createAdminCookSubscriptionPricing: vi.fn(),
  updateAdminCookSubscriptionPricing: vi.fn(),
  deleteAdminCookSubscriptionPricing: vi.fn(),
}));

import SubscriptionsPage from "@/features/subscriptions/pages/SubscriptionsPage";
import SubscriptionDetailsPage from "@/features/subscriptions/pages/SubscriptionDetailsPage";
import SubscriptionPricingPage from "@/features/subscriptions/pages/SubscriptionPricingPage";
import CookSubscriptionPricingPage from "@/features/subscriptions/pages/CookSubscriptionPricingPage";

describe("subscriptions pages", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.useDebounce.mockImplementation((value) => value);
    mocks.extractApiError.mockImplementation((_error, fallback) => fallback);
    mocks.useMutation.mockImplementation(() => ({ isPending: false, mutate: vi.fn() }));
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.useSearchParams.mockReturnValue([new URLSearchParams({ page: "0" }), vi.fn()]);
    mocks.useParams.mockReturnValue({ id: "15" });
    mocks.getServices.mockResolvedValue({ items: [{ id: 5, name: "Cook Helper", categoryName: "Home", serviceType: "meal" }] });
  });

  it("renders subscriptions list page and updates filters", () => {
    mocks.useQuery.mockReturnValue({
      data: { content: [{ id: 15, customerId: 9, customerName: "Neha", serviceId: 3, serviceName: "Cook", status: "ACTIVE", frequency: "DAILY", startDate: "2026-07-01", endDate: "2026-08-01", visits: 10, durationHours: 2, timeSlot: "10-12", partnerName: "Ravi" }], totalElements: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SubscriptionsPage />);
    expect(screen.getByText("Subscription Management")).toBeInTheDocument();
    expect(screen.getByText("Neha")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Customer ID"), { target: { value: "abc42" } });
    expect((screen.getByPlaceholderText("Customer ID") as HTMLInputElement).value).toBe("42");
  });

  it("covers subscriptions list fallback states, params, and row fallbacks", () => {
    const setSearchParams = vi.fn();
    mocks.useSearchParams.mockReturnValue([new URLSearchParams({ page: "-3", status: "CANCELLED", customerId: "11" }), setSearchParams]);
    mocks.useQuery.mockReturnValue({
      data: {
        content: [
          {
            id: 18,
            customerId: 11,
            customerName: "",
            serviceId: 7,
            serviceName: "",
            status: "CANCELLED",
            frequency: "",
            startDate: "",
            endDate: "",
            visits: undefined,
            durationHours: undefined,
            timeSlot: "",
            partnerName: "",
          },
          {
            id: 19,
            customerId: undefined,
            customerName: "",
            serviceId: undefined,
            serviceName: "",
            status: "PAUSED",
            frequency: "",
            startDate: "",
            endDate: "",
            visits: undefined,
            durationHours: undefined,
            timeSlot: "",
            partnerName: "",
          },
        ],
        totalElements: 25,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SubscriptionsPage />);
    expect(screen.getByText("Customer #11")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getAllByText("PAUSED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByDisplayValue("CANCELLED"), { target: { value: "" } });
    expect(setSearchParams).toHaveBeenCalled();

    fireEvent.click(screen.getByText("page-1"));
    expect(setSearchParams).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(setSearchParams).toHaveBeenCalledWith(new URLSearchParams({ page: "0" }));
  });

  it("shows the admin professional change review panel for the current subscription", async () => {
    mocks.useMutation.mockImplementation((options: any) => ({
      isPending: false,
      mutate: (payload: any) => {
        if (options.mutationFn) {
          void options.mutationFn(payload);
        }
      },
    }));
    mocks.useQuery.mockImplementation((options: any) => {
      const key = options.queryKey?.[0];
      if (key === "admin-subscription-detail") {
        return {
          data: { id: 15, customerName: "Neha", serviceName: "Cook", status: "PENDING_ADMIN_REVIEW", frequency: "WEEKLY", startDate: "2026-07-01", endDate: "2026-08-01", visits: 5 },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      if (key === "admin-subscription-calendar") {
        return { data: [], isLoading: false, isError: false, refetch: vi.fn() };
      }
      if (key === "admin-subscription-assignment") {
        return { data: null, isLoading: false, isError: false, refetch: vi.fn() };
      }
      if (key === "admin-subscription-change-requests") {
        return {
          data: [{ id: 101, subscriptionId: 15, customerId: 9, reasonCategory: "PROFESSIONAL_PREFERENCE", description: "Need a different professional", status: "PENDING_ADMIN_REVIEW" }],
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      return { data: null, isLoading: false, isError: false, refetch: vi.fn() };
    });

    render(<SubscriptionDetailsPage />);

    expect(screen.getByText("Professional Change Requests")).toBeInTheDocument();
    expect(screen.getByText("Need a different professional")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => expect(mocks.reviewAdminSubscriptionChangeRequest).toHaveBeenCalledWith(101, expect.objectContaining({ status: "APPROVED" })));
  });

  it("includes lifecycle states used by the admin-controlled subscription flow", () => {
    mocks.useQuery.mockReturnValue({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SubscriptionsPage />);

    expect(screen.getByRole("option", { name: "PENDING_ADMIN_REVIEW" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "UNDER_REVIEW" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PENDING_PARTNER_ASSIGNMENT" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PENDING_PARTNER_ACCEPTANCE" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "CONFIRMED" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "REJECTED" })).toBeInTheDocument();
  });

  it("covers subscriptions list loading, error, and empty states", () => {
    mocks.useQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });
    const loadingView = render(<SubscriptionsPage />);
    expect(screen.getByText("Loading subscriptions...")).toBeInTheDocument();
    loadingView.unmount();

    const refetch = vi.fn();
    mocks.useQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
      refetch,
    });
    const errorView = render(<SubscriptionsPage />);
    fireEvent.click(screen.getByText("Failed to load subscriptions"));
    expect(refetch).toHaveBeenCalled();
    errorView.unmount();

    mocks.useQuery.mockReturnValueOnce({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<SubscriptionsPage />);
    expect(screen.getByText("No subscriptions found")).toBeInTheDocument();
  });

  it("renders and submits subscription pricing page flows", async () => {
    const createMutation = vi.fn();
    const updateMutation = vi.fn();
    const deleteMutation = vi.fn();
    let mutationCall = 0;
    mocks.useMutation.mockImplementation((options: any) => {
      mutationCall += 1;
      if (mutationCall === 1) {
        return { isPending: false, mutate: (payload: any) => { createMutation(payload); void options.onSuccess?.(); } };
      }
      if (mutationCall === 2) {
        return { isPending: false, mutate: (payload: any) => { updateMutation(payload); void options.onSuccess?.(); } };
      }
      return { isPending: false, mutate: (payload: any) => { deleteMutation(payload); void options.onSuccess?.(); } };
    });
    mocks.useQuery.mockImplementation(() => ({
        data: [{ id: 1, serviceId: 5, durationHours: 2, perVisitPrice: 500, active: true }],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      }));

    render(<SubscriptionPricingPage />);
    fireEvent.click(screen.getByText("+ Add Price"));
    fireEvent.change(screen.getByLabelText("Duration Hours"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Per Visit Price"), { target: { value: "0" } });
    fireEvent.submit(document.getElementById("subscription-pricing-form") as HTMLFormElement);
    expect(mocks.error).toHaveBeenCalledWith("Duration is required");

    fireEvent.change(screen.getByLabelText("Duration Hours"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Per Visit Price"), { target: { value: "600" } });
    fireEvent.submit(document.getElementById("subscription-pricing-form") as HTMLFormElement);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Subscription price created"));

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.submit(document.getElementById("subscription-pricing-form") as HTMLFormElement);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Subscription price updated"));

    fireEvent.click(screen.getByText("Deactivate"));
    fireEvent.click(screen.getByText("confirm-subscription"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Subscription price deactivated"));
  });

  it("renders and submits cook subscription pricing page flows", async () => {
    const createMutation = vi.fn();
    const updateMutation = vi.fn();
    const deleteMutation = vi.fn();
    let mutationCall = 0;
    mocks.useMutation.mockImplementation((options: any) => {
      mutationCall += 1;
      if (mutationCall === 1) {
        return { isPending: false, mutate: (payload: any) => { createMutation(payload); void options.onSuccess?.(); } };
      }
      if (mutationCall === 2) {
        return { isPending: false, mutate: (payload: any) => { updateMutation(payload); void options.onSuccess?.(); } };
      }
      return { isPending: false, mutate: (payload: any) => { deleteMutation(payload); void options.onSuccess?.(); } };
    });
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey?.[0] === "admin-cook-subscription-pricing") {
        return {
          data: [{ id: 1, serviceId: 5, familySize: "MEDIUM", familySizeLabel: "3-4 Members", pricePerVisit: 800, active: true }],
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }

      return {
        data: [{ id: 5, name: "Cook Helper", categoryName: "Home" }],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
    });

    render(<CookSubscriptionPricingPage />);
    fireEvent.click(screen.getByText("+ Add Cook Price"));
    fireEvent.change(screen.getByLabelText("Per Visit Price"), { target: { value: "0" } });
    fireEvent.submit(document.getElementById("cook-subscription-pricing-form") as HTMLFormElement);
    expect(mocks.error).toHaveBeenCalledWith("Per visit price is required");

    fireEvent.change(screen.getByLabelText("Per Visit Price"), { target: { value: "900" } });
    fireEvent.submit(document.getElementById("cook-subscription-pricing-form") as HTMLFormElement);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Cook subscription price created"));

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.submit(document.getElementById("cook-subscription-pricing-form") as HTMLFormElement);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Cook subscription price updated"));

    fireEvent.click(screen.getByText("Deactivate"));
    fireEvent.click(screen.getByText("confirm-subscription"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Cook subscription price deactivated"));
  });
});
