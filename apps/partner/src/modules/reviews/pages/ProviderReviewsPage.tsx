import { useMemo, useState } from "react";

import { useProviderReviewsQuery } from "../hooks/useProviderReviews";

export function ProviderReviewsPage() {
  const [page, setPage] = useState(0);
  const size = 10;
  const query = useProviderReviewsQuery(page, size);

  const rows = query.data?.content ?? [];
  const total = query.data?.totalElements ?? 0;
  const totalPages = query.data?.totalPages ?? 1;

  const summary = useMemo(() => {
    if (rows.length === 0) {
      return { average: 0, fiveStar: 0 };
    }
    const sum = rows.reduce((acc, row) => acc + row.rating, 0);
    const fiveStar = rows.filter((row) => row.rating === 5).length;
    return {
      average: Number((sum / rows.length).toFixed(1)),
      fiveStar,
    };
  }, [rows]);

  return (
    <section className="panel light-panel stack">
      <div className="panel-header">
        <div>
          <h2>Provider Reviews</h2>
          <p className="item-subtitle">Customer feedback for your services</p>
        </div>
      </div>

      <div className="metrics">
        <article className="metric-card">
          <p className="metric-label">Average Rating</p>
          <p className="metric-value">{summary.average}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Total Reviews (page)</p>
          <p className="metric-value">{rows.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">5 Star Reviews (page)</p>
          <p className="metric-value">{summary.fiveStar}</p>
        </article>
      </div>

      {query.isLoading ? (
        <p className="item-subtitle">Loading reviews...</p>
      ) : query.isError ? (
        <p className="error-text">Unable to fetch provider reviews.</p>
      ) : rows.length === 0 ? (
        <p className="item-subtitle">No reviews found.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((review) => (
                <tr key={review.id}>
                  <td>{review.customerName || "-"}</td>
                  <td>{review.serviceName || "-"}</td>
                  <td>{review.rating} / 5</td>
                  <td>{review.comment || "-"}</td>
                  <td>{review.createdAt || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="inline-actions">
        <button
          type="button"
          className="small-action"
          disabled={page <= 0}
          onClick={() => setPage((prev) => Math.max(0, prev - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="small-action"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next
        </button>
        <span className="item-subtitle">
          Page {page + 1} / {totalPages} ({total} total)
        </span>
      </div>
    </section>
  );
}
