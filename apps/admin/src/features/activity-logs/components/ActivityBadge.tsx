// components/activity/ActivityBadge.tsx
export default function ActivityBadge({ module }: { module: string }) {
  const styles: any = {
    User: "bg-blue-100 text-blue-700",
    Booking: "bg-green-100 text-green-700",
    Payment: "bg-purple-100 text-purple-700",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${styles[module]}`}>
      {module}
    
    </span>
  );
}