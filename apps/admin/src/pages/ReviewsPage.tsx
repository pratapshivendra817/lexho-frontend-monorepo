// src/pages/ReviewsPage.tsx
import { useState } from "react";
import { reviewsData } from "../data/reviews";
import type { Review } from "../types/review";
import ReviewTable from "../components/ReviewTable";
import ReviewFilters from "../components/ReviewFilters";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(reviewsData);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [serviceFilter, setServiceFilter] = useState("");

  const filteredReviews = reviews.filter((r) => {
    return (
      (ratingFilter ? r.rating === ratingFilter : true) &&
      r.service.toLowerCase().includes(serviceFilter.toLowerCase())
    );
  });

  const handleDelete = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const handleFlag = (id: string) => {
    alert(`Review ${id} flagged`);
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Ratings & Reviews</h1>

      <ReviewFilters
        rating={ratingFilter}
        service={serviceFilter}
        onRatingChange={setRatingFilter}
        onServiceChange={setServiceFilter}
      />

      <ReviewTable
        data={filteredReviews}
        onDelete={handleDelete}
        onFlag={handleFlag}
      />
    </div>
  );
}