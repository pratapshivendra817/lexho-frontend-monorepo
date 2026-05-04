import { Star } from "lucide-react";

type RatingStarsProps = {
  rating: number;
};

export default function RatingStars({ rating }: RatingStarsProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}
        />
      ))}
    </div>
  );
}
