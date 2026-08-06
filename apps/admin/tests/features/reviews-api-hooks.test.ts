import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClientMock } from "./featureTestUtils";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    patch: mocks.patch,
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

import {
  approveAdminReview,
  getAdminReviewById,
  getAdminReviews,
  getAdminReviewsStats,
  getReportedAdminReviews,
  hideAdminReview,
  rejectAdminReview,
} from "@/features/reviews/api/reviewsApi";
import {
  useAdminReviewDetailsQuery,
  useAdminReviewMutations,
  useAdminReviewsQuery,
  useAdminReviewStatsQuery,
  useReportedAdminReviewsQuery,
} from "@/features/reviews/hooks/useAdminReviews";

describe("reviews api and hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockImplementation((options) => options);
    mocks.useMutation.mockImplementation((options) => options);
  });

  it("maps review list payloads and strips empty filters from the request", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        data: {
          results: [
            {
              reviewId: 5,
              booking: { id: "bk-1" },
              customer: { id: "c-1" },
              provider: { id: "p-1" },
              userName: "Riya",
              partner: "Manoj",
              service: "Cleaning",
              rating: "4",
              reviewComment: "Nice",
              images: ["a.jpg", ""],
              status: "approved",
              reports: "2",
              adminReason: "checked",
            },
          ],
          total: "9",
          totalPages: "2",
          page: "1",
        },
      },
    });

    await expect(
      getAdminReviews({ page: 1, size: 10, rating: 4, status: "", partner: "", customer: "", service: "" }),
    ).resolves.toEqual({
      content: [
        {
          id: "5",
          bookingId: "bk-1",
          customerId: "c-1",
          partnerId: "p-1",
          customerName: "Riya",
          partnerName: "Manoj",
          serviceName: "Cleaning",
          rating: 4,
          comment: "Nice",
          reviewText: "Nice",
          images: ["a.jpg"],
          status: "APPROVED",
          reportCount: 2,
          reportReason: undefined,
          moderationReason: "checked",
          requestId: undefined,
          correlationId: undefined,
          createdAt: undefined,
        },
      ],
      totalElements: 9,
      totalPages: 2,
      pageNumber: 1,
    });

    expect(mocks.get).toHaveBeenCalledWith("/api/admin/reviews", {
      params: {
        page: 1,
        size: 10,
        rating: 4,
        status: undefined,
        partner: undefined,
        customer: undefined,
        service: undefined,
        search: undefined,
        startDate: undefined,
        endDate: undefined,
      },
    });
  });

  it("maps detail, reported list, and stats responses", async () => {
    mocks.get
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({
        data: { id: "rev-1", comment: "Hidden", status: "hidden", flagCount: "5", hideReason: "policy" },
      })
      .mockResolvedValueOnce({
        data: { reviews: [{ id: "rev-2", comment: "Reported" }], totalElements: 1, totalPages: 1, pageNumber: 0 },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            totalReviews: "12",
            averageRating: "4.6",
            hiddenReviews: "3",
            reportedReviews: 2,
            partnerWiseRatings: [{ partnerName: "Amit", averageRating: "4.8" }],
            serviceWiseRatings: [{ serviceName: "Cook", rating: "4.1" }],
          },
        },
      });

    await expect(getAdminReviewById("missing")).resolves.toBeNull();
    await expect(getAdminReviewById("rev-1")).resolves.toMatchObject({
      id: "rev-1",
      status: "HIDDEN",
      reportCount: 5,
      moderationReason: "policy",
    });
    await expect(getReportedAdminReviews({ page: 0, size: 10 })).resolves.toMatchObject({
      content: [{ id: "rev-2", comment: "Reported" }],
    });
    await expect(getAdminReviewsStats()).resolves.toEqual({
      totalReviews: 12,
      averageRating: 4.6,
      hiddenReviews: 3,
      reportedReviews: 2,
      partnerWiseRatings: [{ name: "Amit", value: 4.8 }],
      serviceWiseRatings: [{ name: "Cook", value: 4.1 }],
    });
  });

  it("calls review moderation endpoints with the expected payloads", async () => {
    mocks.patch.mockResolvedValue({ status: 200 });

    await approveAdminReview("11");
    await rejectAdminReview("11");
    await rejectAdminReview("11", "spam");
    await hideAdminReview("11");
    await hideAdminReview("11", "abuse");

    expect(mocks.patch).toHaveBeenNthCalledWith(1, "/api/admin/reviews/11/approve");
    expect(mocks.patch).toHaveBeenNthCalledWith(2, "/api/admin/reviews/11/reject", undefined);
    expect(mocks.patch).toHaveBeenNthCalledWith(3, "/api/admin/reviews/11/reject", { reason: "spam" });
    expect(mocks.patch).toHaveBeenNthCalledWith(4, "/api/admin/reviews/11/hide", undefined);
    expect(mocks.patch).toHaveBeenNthCalledWith(5, "/api/admin/reviews/11/hide", { reason: "abuse" });
  });

  it("configures review queries and invalidates all review caches after mutations", async () => {
    const queryClient = createQueryClientMock();
    mocks.useQueryClient.mockReturnValue(queryClient);

    const listQuery = useAdminReviewsQuery({ page: 1, size: 10 });
    expect(listQuery.queryKey).toEqual(["admin-reviews", { page: 1, size: 10 }]);
    expect(listQuery.placeholderData?.("previous")).toBe("previous");

    const reportedQuery = useReportedAdminReviewsQuery({ page: 2, size: 20 });
    expect(reportedQuery.queryKey).toEqual(["admin-reported-reviews", { page: 2, size: 20 }]);

    const detailQuery = useAdminReviewDetailsQuery(undefined);
    expect(detailQuery.enabled).toBe(false);

    const statsQuery = useAdminReviewStatsQuery();
    expect(statsQuery.queryKey).toEqual(["admin-review-stats"]);

    const mutations = useAdminReviewMutations();
    await mutations.approveMutation.onSuccess?.(undefined, undefined as never, undefined);
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ["admin-reviews"] });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ["admin-reported-reviews"] });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(3, { queryKey: ["admin-review-stats"] });
  });
});
