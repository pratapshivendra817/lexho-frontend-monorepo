import { isValidMobile } from "./validation";

describe("isValidMobile", () => {
  it("accepts valid Indian mobile numbers that start from 6 to 9", () => {
    expect(isValidMobile("9876543210")).toBe(true);
    expect(isValidMobile("6123456789")).toBe(true);
  });

  it("rejects invalid mobile numbers", () => {
    expect(isValidMobile("5123456789")).toBe(false);
    expect(isValidMobile("987654321")).toBe(false);
    expect(isValidMobile("98765432101")).toBe(false);
    expect(isValidMobile("98A6543210")).toBe(false);
  });
});
