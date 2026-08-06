import { resolveUserIdFromAuth } from "../src/utils/authUser";

const runtime = globalThis as any;

function token(payload: unknown) {
  return `header.${runtime.Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  )}.signature`;
}

describe("utils/authUser", () => {
  it.each([
    [7, "", 7],
    ["8", "", 8],
    [Number.POSITIVE_INFINITY, token({ userId: 9 }), 9],
    [null, token({ userId: "invalid", id: 10 }), 10],
    [undefined, token({ id: 0, sub: "11" }), 11],
    [0, token({ sub: -1 }), 0],
  ])("resolves user ID from auth or token", (authId, jwt, expected) => {
    expect(resolveUserIdFromAuth(authId, jwt)).toBe(expected);
  });

  it("uses atob when available", () => {
    const originalAtob = runtime.atob;
    runtime.atob = jest.fn((value: string) =>
      runtime.Buffer.from(value, "base64").toString("utf8"),
    );

    expect(resolveUserIdFromAuth(null, token({ userId: 12 }))).toBe(12);
    expect(runtime.atob).toHaveBeenCalled();

    runtime.atob = originalAtob;
  });

  it("falls back to Buffer when atob is unavailable", () => {
    const originalAtob = runtime.atob;
    runtime.atob = undefined;

    expect(resolveUserIdFromAuth(null, token({ userId: 13 }))).toBe(13);

    runtime.atob = originalAtob;
  });

  it("returns zero when no base64 decoder is available", () => {
    const originalAtob = runtime.atob;
    const originalBuffer = runtime.Buffer;

    runtime.atob = undefined;
    runtime.Buffer = undefined;
    expect(resolveUserIdFromAuth(null, "header.e30.signature")).toBe(0);

    runtime.atob = originalAtob;
    runtime.Buffer = originalBuffer;
  });

  it.each([
    "",
    "single-part",
    "header.%%%.signature",
    token(null),
    token({ userId: Number.NaN }),
  ])("returns zero for unusable token %s", (jwt) => {
    expect(resolveUserIdFromAuth(null, jwt)).toBe(0);
  });
});
