import { describe, expect, it } from "vitest";

describe("customer profile control schemas", () => {
  it("validates customer profile governance payloads", async () => {
    const { customerProfileEditSchema } = await import("@/features/customer-profile-control/schema");

    expect(
      customerProfileEditSchema.safeParse({
        profileEditLocked: true,
        emailVerified: false,
        phoneVerified: true,
        profileImageApproved: true,
        adminNotes: " note ",
      }),
    ).toMatchObject({ success: true });

    const result = customerProfileEditSchema.safeParse({
      profileEditLocked: true,
      emailVerified: false,
      phoneVerified: true,
      profileImageApproved: true,
      adminNotes: "x".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Notes can be up to 500 chars");
      expect(result.error.issues[0]?.path).toEqual(["adminNotes"]);
    }
  });

  it("validates profile content fields and trim/min branches", async () => {
    const { profileContentSchema } = await import("@/features/customer-profile-control/schema");

    expect(
      profileContentSchema.safeParse({
        aboutUs: "  about us value  ",
        termsOfService: "  terms value  ",
        privacyPolicy: "  privacy text  ",
      }).success,
    ).toBe(true);

    const failed = profileContentSchema.safeParse({
      aboutUs: " short ",
      termsOfService: " tiny ",
      privacyPolicy: " bad ",
    });
    expect(failed.success).toBe(false);
    if (!failed.success) {
      expect(failed.error.issues.map((issue) => issue.message)).toEqual([
        "About us should be descriptive",
        "Terms are required",
        "Privacy policy is required",
      ]);
    }
  });
});
