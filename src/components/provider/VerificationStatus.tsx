import { useState } from "react";
import type { Provider, VerificationStatus } from "../../types/provider";
import Card from "../Ui/Card";
import Badge from "../Ui/Badge";
import Button from "../Ui/Button";
import Input from "../Ui/Input";

export default function VerificationStatusComp({
  data,
}: {
  data: Provider;
}) {
  const [status, setStatus] = useState<VerificationStatus>(data.status);
  const [reason, setReason] = useState("");

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
          onClick={() => setStatus("APPROVED")}
        />
        <Button
          label="Reject"
          variant="red"
          onClick={() => setStatus("REJECTED")}
        />
      </div>
    </Card>
  );
}