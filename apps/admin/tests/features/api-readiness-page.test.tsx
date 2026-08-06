import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  probeGet: vi.fn(),
  probePost: vi.fn(),
  axiosCreate: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.apiGet,
    post: mocks.apiPost,
  },
}));

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: mocks.axiosCreate,
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

describe("ApiReadinessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.axiosCreate.mockReturnValue({
      get: mocks.probeGet,
      post: mocks.probePost,
    });
  });

  it("renders endpoint readiness defaults and marks manual rows", async () => {
    const ApiReadinessPage = (await import("@/features/api-readiness/pages/ApiReadinessPage")).default;
    render(<ApiReadinessPage />);

    expect(screen.getByText("Endpoint Readiness")).toBeInTheDocument();
    expect(screen.getByText(/Base URL:/)).toBeInTheDocument();
    expect(screen.getByText("Auto checks passed: 0 / 15")).toBeInTheDocument();
    expect(screen.getAllByText("Manual").length).toBeGreaterThan(1);
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBe(15);
  });

  it("runs auto checks sequentially across probe and admin clients and handles acceptable auth failures", async () => {
    const nowSpy = vi.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("10:00 AM");
    mocks.probePost
      .mockRejectedValueOnce(Object.assign(new Error("login denied"), { isAxiosError: true, response: { status: 401, data: { message: "Unauthorized" } } }))
      .mockResolvedValueOnce({ status: 200 });
    mocks.apiGet.mockResolvedValue({ status: 200 });

    const ApiReadinessPage = (await import("@/features/api-readiness/pages/ApiReadinessPage")).default;
    render(<ApiReadinessPage />);

    fireEvent.click(screen.getByRole("button", { name: "Run All Auto Checks" }));

    await waitFor(() => {
      expect(mocks.probePost).toHaveBeenNthCalledWith(1, "/api/admin/login", {});
      expect(mocks.probePost).toHaveBeenNthCalledWith(2, "/api/admin/verify-otp", {});
      expect(mocks.apiGet).toHaveBeenCalledWith("/api/admin/dashboard/stats");
    });

    await waitFor(() => {
      expect(screen.getByText("Auto checks passed: 15 / 15")).toBeInTheDocument();
    });

    expect(screen.getAllByText("10:00 AM").length).toBeGreaterThan(0);
    nowSpy.mockRestore();
  });

  it("handles retry failures with api errors and unknown errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const nowSpy = vi.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("11:11 AM");
    mocks.probePost.mockResolvedValue({ status: 200 });
    mocks.apiGet
      .mockRejectedValueOnce(Object.assign(new Error("Forbidden"), { isAxiosError: true, response: { status: 403, data: { message: "Forbidden" } } }))
      .mockRejectedValueOnce(new Error("socket closed"));

    const ApiReadinessPage = (await import("@/features/api-readiness/pages/ApiReadinessPage")).default;
    render(<ApiReadinessPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[2]!);
    await waitFor(() => {
      expect(screen.getByText("403")).toBeInTheDocument();
      expect(screen.getByText("Forbidden")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[3]!);
    await waitFor(() => {
      expect(screen.getByText("Unknown error")).toBeInTheDocument();
    });

    expect(errorSpy).toHaveBeenCalled();
    nowSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
