import { formatAddressLine } from "../src/utils/addressFormatter";

describe("utils/addressFormatter", () => {
  it("combines every supported address component", () => {
    expect(
      formatAddressLine({
        flatNo: "12A",
        floor: 3,
        buildingName: "Lexho Tower",
        landmark: "Central Mall",
        addressLine: "Vijay Nagar",
        area: "Scheme 54",
        sector: "Sector B",
        city: "Indore",
        state: "Madhya Pradesh",
        country: "India",
        pincode: "452010",
      }),
    ).toBe(
      "12A, Floor 3, Lexho Tower, Near Central Mall, Vijay Nagar, Scheme 54, Sector B, Indore, Madhya Pradesh, India, 452010",
    );
  });

  it("splits comma-separated values and removes normalized duplicates", () => {
    expect(
      formatAddressLine({
        addressLine: "Vijay-Nagar, Indore",
        area: "vijay nagar",
        city: "Indore",
        fullAddress: "ignored because addressLine wins",
      }),
    ).toBe("Vijay-Nagar, Indore");
  });

  it("skips a broader part after a more specific included part", () => {
    expect(
      formatAddressLine({
        area: "Vijay Nagar",
        city: "Nagar",
      }),
    ).toBe("Vijay Nagar");
  });

  it.each([
    [null, "Address not available"],
    [{}, "Address not available"],
    [{ flatNo: " , " }, "Address not available"],
  ])("uses the default fallback for empty input", (row, expected) => {
    expect(formatAddressLine(row)).toBe(expected);
  });

  it("supports fullAddress, postalCode, and a custom fallback", () => {
    expect(
      formatAddressLine({
        fullAddress: "MG Road",
        postalCode: 452001,
      }),
    ).toBe("MG Road, 452001");
    expect(formatAddressLine(undefined, "Missing")).toBe("Missing");
  });
});
