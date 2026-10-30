import { getPayoutDetailRows, getPayoutStatusLabel } from "../PayoutDetailScreen";

describe("PayoutDetailScreen helpers", () => {
  const tr = (key: string, fallback: string) =>
    ({
      "payouts.status_settled": "Settled",
      "payouts.settlement_amount": "Settlement Amount",
      "payouts.created_at": "Created At",
      "payouts.settled_at": "Settled At",
    }[key] ?? fallback);

  it("maps payout statuses through the translation resolver", () => {
    expect(getPayoutStatusLabel("SETTLED", tr)).toBe("Settled");
    expect(getPayoutStatusLabel("UNKNOWN", tr)).toBe("UNKNOWN");
    expect(getPayoutStatusLabel(undefined, tr)).toBe("-");
  });

  it("builds translated payout detail rows", () => {
    const rows = getPayoutDetailRows(
      {
        id: "42",
        settlementAmount: 440,
        status: "SETTLED",
        createdAt: "2026-06-20T10:00:00Z",
        settledAt: "2026-06-21T10:00:00Z",
      },
      tr,
    );

    expect(rows).toEqual([
      { label: "Settlement Amount", value: "INR 440.00", strong: true },
      { label: "Created At", value: new Date("2026-06-20T10:00:00Z").toLocaleString() },
      { label: "Settled At", value: new Date("2026-06-21T10:00:00Z").toLocaleString() },
    ]);
  });
});
