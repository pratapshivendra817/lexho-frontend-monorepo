import { getPayoutListRowCopy, getPayoutListStatusLabel } from "../PayoutsScreen";

describe("PayoutsScreen helpers", () => {
  const tr = (key: string, fallback: string) =>
    ({
      "payouts.status_paid": "Paid",
      "payouts.status_processing": "Processing",
      "earnings.settlement": "Settlement",
    }[key] ?? fallback);
  const t = (key: string) =>
    ({
      "payouts.title": "Payout",
      "payouts.status": "Status",
    }[key] ?? key);

  it("maps payout statuses through translated labels", () => {
    expect(getPayoutListStatusLabel("PAID", tr)).toBe("Paid");
    expect(getPayoutListStatusLabel("PROCESSING", tr)).toBe("Processing");
    expect(getPayoutListStatusLabel("UNKNOWN", tr)).toBe("UNKNOWN");
  });

  it("builds translated payout list row copy", () => {
    expect(getPayoutListRowCopy({
      id: "p1",
      settlementAmount: 1200,
      createdAt: "2026-07-01T00:00:00Z",
      status: "PAID",
    }, t, tr)).toEqual({
      title: "Payout #p1",
      dateLabel: new Date("2026-07-01T00:00:00Z").toLocaleDateString(),
      statusLabel: "Status: Paid",
      amountLabel: "INR 1200.00",
    });
  });
});
