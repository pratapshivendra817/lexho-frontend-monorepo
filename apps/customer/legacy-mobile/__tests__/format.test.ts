import { formatCurrency, formatDateTime } from "../src/utils/format";

describe("utils/format", () => {
  it.each([
    [1234, "₹1,234"],
    [0, "₹0"],
    [-250, "-₹250"],
    [Number.NaN, "₹0"],
    [Number.POSITIVE_INFINITY, "₹0"],
  ])("formats currency value %s", (amount, expected) => {
    expect(formatCurrency(amount)).toBe(expected);
  });

  it("formats a valid date using the Indian locale", () => {
    const input = "2026-06-13T10:30:00.000Z";
    const expected = new Date(input).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    expect(formatDateTime(input)).toBe(expected);
  });

  it.each(["not-a-date", "", "invalid"])(
    "returns invalid date input unchanged: %s",
    (input) => {
      expect(formatDateTime(input)).toBe(input);
    },
  );
});
