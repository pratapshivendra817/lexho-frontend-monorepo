import type { Provider } from "../../types/provider";
import Card from "../Ui/Card";

export default function ProviderInfo({ data }: { data: Provider }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Provider Info</h2>

      <div className="space-y-2 text-sm">
        <p><strong>Name:</strong> {data.name}</p>
        <p><strong>Phone:</strong> {data.phone}</p>
        <p><strong>City:</strong> {data.city}</p>
        <p><strong>Experience:</strong> {data.experience}</p>
        <p><strong>Rating:</strong> ⭐ {data.rating}</p>
      </div>
    </Card>
  );
}