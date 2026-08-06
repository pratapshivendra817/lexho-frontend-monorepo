import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useDebounce: vi.fn(),
  useAdminReviewsQuery: vi.fn(),
  useReportedAdminReviewsQuery: vi.fn(),
  useAdminReviewStatsQuery: vi.fn(),
  useAdminReviewDetailsQuery: vi.fn(),
  useAdminReviewMutations: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  extractApiError: vi.fn(),
  approveMutation: vi.fn(),
  rejectMutation: vi.fn(),
  hideMutation: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: mocks.useDebounce,
}));

vi.mock("react-hot-toast", () => ({
  default: { success: mocks.success, error: mocks.error },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div>grid</div>,
  XAxis: () => <div>x-axis</div>,
  YAxis: () => <div>y-axis</div>,
  Tooltip: () => <div>tooltip</div>,
  Bar: () => <div>bar</div>,
}));

vi.mock("lucide-react", () => ({
  Star: ({ className }: { className?: string }) => <div data-testid={className} />,
}));

vi.mock("@/components/admin", () => ({
  StatCard: ({ title, value }: any) => <div>{title}:{value}</div>,
  Skeleton: ({ className }: any) => <div>{className}</div>,
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
  Pagination: ({ page, onPageChange }: any) => (
    <div>
      <span>page-{page}</span>
      <button onClick={() => onPageChange(page + 1)}>page-next</button>
    </div>
  ),
  Modal: ({ open, title, children }: any) => (open ? <div><h3>{title}</h3>{children}</div> : null),
  ConfirmDialog: ({ open, title, description, onConfirm }: any) =>
    open ? <div><h3>{title}</h3><p>{description}</p><button onClick={onConfirm}>confirm-review</button></div> : null,
}));

vi.mock("@/features/reviews/hooks/useAdminReviews", () => ({
  useAdminReviewsQuery: mocks.useAdminReviewsQuery,
  useReportedAdminReviewsQuery: mocks.useReportedAdminReviewsQuery,
  useAdminReviewStatsQuery: mocks.useAdminReviewStatsQuery,
  useAdminReviewDetailsQuery: mocks.useAdminReviewDetailsQuery,
  useAdminReviewMutations: mocks.useAdminReviewMutations,
}));

import ReviewsPage from "@/features/reviews/pages/ReviewsPage";
import RatingStars from "@/features/reviews/components/RatingStars";
import { ReviewStatusBadge } from "@/features/reviews/components/ReviewStatusBadge";
import { ReviewsFiltersBar } from "@/features/reviews/components/ReviewsFiltersBar";
import { ReviewsStatsCards } from "@/features/reviews/components/ReviewsStatsCards";

describe("reviews components and page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDebounce.mockImplementation((value) => value);
    mocks.extractApiError.mockImplementation((_error, fallback) => fallback);
    mocks.useAdminReviewsQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "r1",
            bookingId: "b1",
            customerId: "c1",
            customerName: "Riya",
            partnerId: "p1",
            partnerName: "Amit",
            serviceName: "Cleaning",
            rating: 4,
            comment: "Good",
            reviewText: "Good",
            images: ["img-1"],
            status: "PENDING",
            reportCount: 2,
            moderationReason: "audit",
            requestId: "req-1",
            correlationId: "corr-1",
            createdAt: "2026-07-16T10:00:00Z",
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    mocks.useReportedAdminReviewsQuery.mockReturnValue({
      data: { content: [{ id: "r2", customerName: "Mina", bookingId: "b2", partnerId: "p2", partnerName: "Jay", comment: "Bad", reportReason: "abuse", reportCount: 1, status: "REJECTED" }], totalElements: 1 },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.useAdminReviewStatsQuery.mockReturnValue({
      data: {
        totalReviews: 4,
        averageRating: 4.2,
        hiddenReviews: 1,
        reportedReviews: 2,
        partnerWiseRatings: [{ name: "Amit", value: 4.5 }],
        serviceWiseRatings: [{ name: "Cleaning", value: 4.2 }],
      },
    });
    mocks.useAdminReviewDetailsQuery.mockReturnValue({
      data: {
        id: "r1",
        customerName: "Riya",
        customerId: "c1",
        bookingId: "b1",
        partnerId: "p1",
        partnerName: "Amit",
        serviceName: "Cleaning",
        status: "PENDING",
        rating: 4,
        requestId: "req-1",
        correlationId: "corr-1",
        moderationReason: "audit",
        reviewText: "Good",
        comment: "Good",
        images: ["img-1"],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.useAdminReviewMutations.mockReturnValue({
      approveMutation: { isPending: false, mutate: mocks.approveMutation.mockImplementation((_id, options) => options?.onSuccess?.()) },
      rejectMutation: { isPending: false, mutate: mocks.rejectMutation.mockImplementation((_payload, options) => options?.onSuccess?.()) },
      hideMutation: { isPending: false, mutate: mocks.hideMutation.mockImplementation((_payload, options) => options?.onSuccess?.()) },
    });
  });

  it("renders helper components", () => {
    const onReset = vi.fn();
    render(
      <>
        <RatingStars rating={3.6} />
        <ReviewStatusBadge status="APPROVED" />
        <ReviewsStatsCards stats={{ totalReviews: 2, averageRating: 4.25, hiddenReviews: 1, reportedReviews: 1, partnerWiseRatings: [], serviceWiseRatings: [] }} />
        <ReviewsFiltersBar
          search="x"
          status=""
          rating=""
          partner=""
          customer=""
          service=""
          startDate=""
          endDate=""
          onSearchChange={vi.fn()}
          onStatusChange={vi.fn()}
          onRatingChange={vi.fn()}
          onPartnerChange={vi.fn()}
          onCustomerChange={vi.fn()}
          onServiceChange={vi.fn()}
          onStartDateChange={vi.fn()}
          onEndDateChange={vi.fn()}
          onReset={onReset}
        />
      </>,
    );
    expect(screen.getAllByTestId("fill-yellow-400 text-yellow-400")).toHaveLength(4);
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
    expect(screen.getByText("Average Rating:4.3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalled();
  });

  it("renders reviews page and handles approve, reject, hide, tab switch, and detail modal", async () => {
    render(<ReviewsPage />);

    expect(screen.getByText("Review Management")).toBeInTheDocument();
    fireEvent.click(screen.getByText("View"));
    expect(screen.getByText("Review Details")).toBeInTheDocument();
    expect(screen.getByText(/RequestId:/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Approve"));
    fireEvent.click(screen.getByText("confirm-review"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Review approved"));

    fireEvent.click(screen.getByText("Reject"));
    fireEvent.change(screen.getByPlaceholderText("Moderation reason"), { target: { value: "spam" } });
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => expect(mocks.rejectMutation).toHaveBeenCalledWith({ id: "r1", reason: "spam" }, expect.any(Object)));

    fireEvent.click(screen.getByText("Hide"));
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => expect(mocks.hideMutation).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Reported Reviews"));
    expect(screen.queryByText("No reported reviews")).not.toBeInTheDocument();
    expect(screen.getByText("abuse")).toBeInTheDocument();
  });

  it("covers review page loading, error, empty, detail fallback, and mutation error branches", async () => {
    mocks.useAdminReviewsQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const loadingView = render(<ReviewsPage />);
    expect(screen.getByText("Loading reviews...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.useAdminReviewsQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const errorView = render(<ReviewsPage />);
    fireEvent.click(screen.getByText("Failed to load reviews"));
    expect(mocks.refetch).toHaveBeenCalled();
    errorView.unmount();

    mocks.useAdminReviewsQuery.mockReturnValueOnce({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const emptyView = render(<ReviewsPage />);
    expect(screen.getByText("No reviews found")).toBeInTheDocument();
    emptyView.unmount();

    mocks.useAdminReviewsQuery.mockReturnValueOnce({
      data: {
        content: [
          {
            id: "r3",
            bookingId: "",
            customerId: "",
            customerName: "",
            partnerId: "",
            partnerName: "",
            serviceName: "",
            rating: 2,
            comment: "",
            reviewText: "",
            images: [],
            status: "REJECTED",
            reportCount: 0,
            moderationReason: "",
            requestId: "",
            correlationId: "",
            createdAt: "not-a-date",
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      isFetching: true,
      refetch: mocks.refetch,
    });
    mocks.useAdminReviewDetailsQuery.mockReturnValue({
      data: {
        id: "r3",
        customerName: "",
        customerId: "",
        bookingId: "",
        partnerId: "",
        partnerName: "",
        serviceName: "",
        status: "REJECTED",
        rating: 2,
        requestId: "",
        correlationId: "",
        moderationReason: "",
        reviewText: "",
        comment: "",
        images: [],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.useAdminReviewMutations.mockReturnValue({
      approveMutation: { isPending: false, mutate: mocks.approveMutation.mockImplementation((_id, options) => options?.onError?.(new Error("approve failed"))) },
      rejectMutation: { isPending: true, mutate: mocks.rejectMutation.mockImplementation((_payload, options) => options?.onError?.(new Error("reject failed"))) },
      hideMutation: { isPending: false, mutate: mocks.hideMutation.mockImplementation((_payload, options) => options?.onError?.(new Error("hide failed"))) },
    });

    render(<ReviewsPage />);
    expect(screen.getAllByText("h-12 w-full")).toHaveLength(2);
    expect(screen.getByText("not-a-date")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("View"));
    expect(screen.getByText("Review Details")).toBeInTheDocument();
    expect(screen.getByText("Moderation Reason:")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Approve"));
    fireEvent.click(screen.getByText("confirm-review"));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Unable to approve review"));

    fireEvent.click(screen.getByText("Reject"));
    fireEvent.change(screen.getByPlaceholderText("Moderation reason"), { target: { value: "   " } });
    expect(screen.getByText("Saving...")).toBeDisabled();
    fireEvent.click(screen.getByText("Cancel"));

    fireEvent.click(screen.getByText("Hide"));
    expect(screen.getByText("Saving...")).toBeDisabled();
  });

  it("covers reported review states and detail retry branches", () => {
    mocks.useReportedAdminReviewsQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      refetch: mocks.refetch,
    });
    const loadingView = render(<ReviewsPage />);
    fireEvent.click(screen.getByText("Reported Reviews"));
    expect(screen.getByText("Loading reported reviews...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.useReportedAdminReviewsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });
    const errorView = render(<ReviewsPage />);
    fireEvent.click(screen.getByText("Reported Reviews"));
    fireEvent.click(screen.getByText("Failed to load reported reviews"));
    expect(mocks.refetch).toHaveBeenCalled();
    errorView.unmount();

    mocks.useReportedAdminReviewsQuery.mockReturnValue({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    render(<ReviewsPage />);
    fireEvent.click(screen.getByText("Reported Reviews"));
    expect(screen.getByText("No reported reviews")).toBeInTheDocument();
  });
});
