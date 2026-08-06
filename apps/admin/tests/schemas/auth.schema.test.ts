import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { loginSchema } from "@/schemas/auth.schema";

describe("loginSchema", () => {
  it("parses valid input with every supported field", () => {
    const result = loginSchema.parse({
      email: "admin@lexho.com",
      password: "secret1",
      remember: true,
    });

    expect(result).toEqual({
      email: "admin@lexho.com",
      password: "secret1",
      remember: true,
    });
  });

  it("accepts minimum valid values and omitted optional fields", () => {
    const result = loginSchema.parse({
      email: "a@b.co",
      password: "123456",
    });

    expect(result).toEqual({
      email: "a@b.co",
      password: "123456",
    });
    expect(result).not.toHaveProperty("remember");
  });

  it("accepts explicit undefined for the optional remember field", () => {
    const parsed = loginSchema.safeParse({
      email: "valid@example.com",
      password: "123456",
      remember: undefined,
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error("Expected schema to accept undefined remember");
    }

    expect(parsed.data).toEqual({
      email: "valid@example.com",
      password: "123456",
      remember: undefined,
    });
  });

  it("allows long values because the schema has no maximum constraints", () => {
    const longEmailLocal = "user".repeat(16);
    const longPassword = "p".repeat(256);

    const parsed = loginSchema.safeParse({
      email: `${longEmailLocal}@example.com`,
      password: longPassword,
      remember: false,
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error("Expected long valid values to pass");
    }

    expect(parsed.data.password).toBe(longPassword);
    expect(parsed.data.remember).toBe(false);
  });

  it("strips unexpected extra fields because the object schema is not strict", () => {
    const result = loginSchema.parse({
      email: "admin@lexho.com",
      password: "secret1",
      remember: false,
      role: "super-admin",
    });

    expect(result).toEqual({
      email: "admin@lexho.com",
      password: "secret1",
      remember: false,
    });
    expect(result).not.toHaveProperty("role");
  });

  it("fails safeParse for an empty object with required-field paths", () => {
    const parsed = loginSchema.safeParse({});

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("Expected schema to reject an empty object");
    }

    expect(parsed.error.issues).toHaveLength(2);
    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["email"],
          message: "Invalid input: expected string, received undefined",
        }),
        expect.objectContaining({
          path: ["password"],
          message: "Invalid input: expected string, received undefined",
        }),
      ]),
    );
  });

  it("throws ZodError from parse for missing required fields", () => {
    expect(() =>
      loginSchema.parse({
        remember: true,
      }),
    ).toThrow(ZodError);
  });

  it("reports validation errors for empty strings with correct messages and paths", () => {
    const parsed = loginSchema.safeParse({
      email: "",
      password: "",
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("Expected empty strings to fail");
    }

    expect(parsed.error.issues).toHaveLength(2);
    expect(parsed.error.issues[0]).toEqual(
      expect.objectContaining({
        path: ["email"],
        message: "Invalid email",
      }),
    );
    expect(parsed.error.issues[1]).toEqual(
      expect.objectContaining({
        path: ["password"],
        message: "Password must be at least 6 chars",
      }),
    );
  });

  it("rejects null values for required and optional fields with type errors", () => {
    const parsed = loginSchema.safeParse({
      email: null,
      password: null,
      remember: null,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("Expected null values to fail");
    }

    expect(parsed.error.issues).toHaveLength(3);
    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["email"],
          message: "Invalid input: expected string, received null",
        }),
        expect.objectContaining({
          path: ["password"],
          message: "Invalid input: expected string, received null",
        }),
        expect.objectContaining({
          path: ["remember"],
          message: "Invalid input: expected boolean, received null",
        }),
      ]),
    );
  });

  it("rejects undefined for required fields while allowing optional remember to be omitted", () => {
    const parsed = loginSchema.safeParse({
      email: undefined,
      password: undefined,
      remember: undefined,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("Expected undefined required fields to fail");
    }

    expect(parsed.error.issues).toHaveLength(2);
    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["email"],
          message: "Invalid input: expected string, received undefined",
        }),
        expect.objectContaining({
          path: ["password"],
          message: "Invalid input: expected string, received undefined",
        }),
      ]),
    );
  });

  it("rejects invalid email formats", () => {
    const parsed = loginSchema.safeParse({
      email: "not-an-email",
      password: "123456",
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("Expected invalid email to fail");
    }

    expect(parsed.error.issues).toHaveLength(1);
    expect(parsed.error.issues[0]).toEqual(
      expect.objectContaining({
        path: ["email"],
        message: "Invalid email",
      }),
    );
  });

  it("rejects passwords below the minimum length and accepts the exact boundary", () => {
    const belowBoundary = loginSchema.safeParse({
      email: "admin@lexho.com",
      password: "12345",
    });

    expect(belowBoundary.success).toBe(false);
    if (belowBoundary.success) {
      throw new Error("Expected short password to fail");
    }

    expect(belowBoundary.error.issues).toHaveLength(1);
    expect(belowBoundary.error.issues[0]).toEqual(
      expect.objectContaining({
        path: ["password"],
        message: "Password must be at least 6 chars",
      }),
    );

    const exactBoundary = loginSchema.safeParse({
      email: "admin@lexho.com",
      password: "123456",
    });

    expect(exactBoundary.success).toBe(true);
  });

  it("rejects incorrect data types", () => {
    const parsed = loginSchema.safeParse({
      email: 123,
      password: 456789,
      remember: "yes",
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("Expected incorrect data types to fail");
    }

    expect(parsed.error.issues).toHaveLength(3);
    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["email"],
          message: "Invalid input: expected string, received number",
        }),
        expect.objectContaining({
          path: ["password"],
          message: "Invalid input: expected string, received number",
        }),
        expect.objectContaining({
          path: ["remember"],
          message: "Invalid input: expected boolean, received string",
        }),
      ]),
    );
  });
});
