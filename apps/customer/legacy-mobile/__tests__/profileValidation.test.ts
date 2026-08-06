import {
  profileSchema,
  validateImageMime,
  validateImageSize,
} from "../src/modules/profile/validation";

const validProfile = {
  firstName: "Shivendra",
  lastName: "Pratap",
  mobile: "9876543210",
  email: "shivendra@example.com",
  gender: "MALE" as const,
  dateOfBirth: "1995-06-12",
};

describe("modules/profile/validation", () => {
  describe("profileSchema", () => {
    it("accepts a complete valid profile", () => {
      expect(profileSchema.parse(validProfile)).toEqual(validProfile);
    });

    it.each(["MALE", "FEMALE", "OTHER", ""] as const)(
      "accepts supported gender %p",
      gender => {
        expect(
          profileSchema.safeParse({ ...validProfile, gender }).success,
        ).toBe(true);
      },
    );

    it.each([
      ["firstName", "", "First name is required"],
      ["firstName", "   ", "First name cannot be empty"],
      ["lastName", "", "Last name is required"],
      ["lastName", "\t ", "Last name cannot be empty"],
      ["email", "invalid-email", "Please enter a valid email"],
      ["dateOfBirth", "", "Date of birth is required"],
    ])("rejects invalid %s", (field, value, message) => {
      const result = profileSchema.safeParse({
        ...validProfile,
        [field]: value,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map(issue => issue.message)).toContain(
          message,
        );
      }
    });

    it.each([
      ["1234567"],
      ["12345678901234567"],
    ])("rejects mobile outside the 8-16 character boundary", mobile => {
      expect(
        profileSchema.safeParse({ ...validProfile, mobile }).success,
      ).toBe(false);
    });

    it.each([
      ["12345678"],
      ["1234567890123456"],
    ])("accepts mobile boundary %p", mobile => {
      expect(
        profileSchema.safeParse({ ...validProfile, mobile }).success,
      ).toBe(true);
    });

    it("rejects unsupported and missing profile fields", () => {
      expect(
        profileSchema.safeParse({ ...validProfile, gender: "UNKNOWN" }).success,
      ).toBe(false);
      expect(
        profileSchema.safeParse({ firstName: "Only" }).success,
      ).toBe(false);
    });
  });

  describe("validateImageSize", () => {
    it.each([
      [1, true],
      [5 * 1024 * 1024, true],
      [5 * 1024 * 1024 + 1, false],
      [0, false],
      [-1, false],
      [Number.NaN, false],
      [Number.POSITIVE_INFINITY, false],
    ])("validates default 5MB boundary for %p bytes", (size, expected) => {
      expect(validateImageSize(size)).toBe(expected);
    });

    it("supports a custom maximum size", () => {
      expect(validateImageSize(2 * 1024 * 1024, 2)).toBe(true);
      expect(validateImageSize(2 * 1024 * 1024 + 1, 2)).toBe(false);
    });
  });

  describe("validateImageMime", () => {
    it.each([
      ["image/jpeg"],
      ["image/jpg"],
      ["image/png"],
      ["image/webp"],
      [" IMAGE/PNG "],
    ])("accepts supported image type %p", type => {
      expect(validateImageMime(type)).toBe(true);
    });

    it.each([
      [undefined],
      [""],
      ["image/gif"],
      ["application/pdf"],
      ["png"],
      [null as unknown as string],
    ])("rejects unsupported image type %p", type => {
      expect(validateImageMime(type)).toBe(false);
    });
  });
});
