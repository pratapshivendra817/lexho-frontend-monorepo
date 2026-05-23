import type { Partner } from "@/types/partner";
import { Card } from "@lexho/ui";

export default function PartnerInfo({ data }: { data: Partner }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Partner Info</h2>

      <div className="space-y-2 text-sm">
        <p><strong>Name:</strong> {data.name}</p>
        <p><strong>Phone:</strong> {data.phone}</p>
        <p><strong>City:</strong> {data.city}</p>
        <p><strong>Experience:</strong> {data.experience}</p>
        <p><strong>Rating:</strong> â­ {data.rating}</p>
      </div>
    </Card>
  );
}


