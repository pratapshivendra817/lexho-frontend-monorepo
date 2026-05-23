import type { Partner } from "@/types/partner";
import { Card } from "@lexho/ui";

export default function PartnerDocuments({ data }: { data: Partner }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Documents</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <img src={data.documents.aadhar} className="rounded-lg" />
        <img src={data.documents.pan} className="rounded-lg" />
        <img src={data.documents.photo} className="rounded-lg" />
      </div>
    </Card>
  );
}


