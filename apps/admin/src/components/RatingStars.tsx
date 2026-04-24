// src/components/RatingStars.tsx
interface Props {
  rating: number;
}

export default function RatingStars({ rating }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>
          {star <= rating ? "⭐" : "☆"}
        </span>
      ))}
    </div>
  );
}