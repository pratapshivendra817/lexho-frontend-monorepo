type StarRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
};

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  return (
    <div className="rating-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`rating-star ${star <= value ? "active" : ""}`}
          aria-label={`Rate ${star}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
