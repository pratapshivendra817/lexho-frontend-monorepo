import { useEffect, useState } from "react";
import type { Partner, VerificationStatus } from "@/types/partner";
import { Badge, Button, Card, Input } from "@lexho/ui";

export default function VerificationStatusComp({
  data,
  onStatusChange,
}: {
  data: Partner;
  onStatusChange?: (status: VerificationStatus, reason?: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<VerificationStatus>(data.status);
  const [reason, setReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setStatus(data.status);
  }, [data.status]);

  const updateStatus = async (nextStatus: VerificationStatus) => {
    setStatus(nextStatus);

    if (!onStatusChange) {
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(nextStatus, reason);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Verification</h2>

      <div className="flex items-center justify-between mb-4">
        <span>Status:</span>
        <Badge status={status} />
      </div>

      {status === "REJECTED" && (
        <div className="mb-4">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason..."
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button
          label="Approve"
          variant="green"
          onClick={() => void updateStatus("APPROVED")}
          disabled={isUpdating}
        />
        <Button
          label="Reject"
          variant="red"
          onClick={() => void updateStatus("REJECTED")}
          disabled={isUpdating}
        />
      </div>
    </Card>
  );
}



