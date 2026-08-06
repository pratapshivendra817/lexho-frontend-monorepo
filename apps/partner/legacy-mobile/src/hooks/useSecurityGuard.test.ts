import { act, renderHook, waitFor } from "@testing-library/react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockDetectDeviceSecurityStatus = jest.fn();

jest.mock("../services/security/rootDetectionService", () => ({
  detectDeviceSecurityStatus: jest.fn(() => mockDetectDeviceSecurityStatus()),
}));

import { useSecurityGuard } from "./useSecurityGuard";

describe("useSecurityGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with null and resolves allowed device status", async () => {
    let resolveStatus!: (value: any) => void;
    mockDetectDeviceSecurityStatus.mockReturnValueOnce(new Promise((resolve) => { resolveStatus = resolve; }));

    const { result } = await renderHook(() => useSecurityGuard());

    expect(result.current).toBeNull();

    await act(async () => {
      resolveStatus({
        rooted: false,
        emulator: false,
        developerMode: false,
        blocked: false,
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        rooted: false,
        emulator: false,
        developerMode: false,
        blocked: false,
      });
    });
  });

  it("resolves blocked device status", async () => {
    mockDetectDeviceSecurityStatus.mockResolvedValueOnce({
      rooted: true,
      emulator: true,
      developerMode: true,
      blocked: true,
    });

    const { result } = await renderHook(() => useSecurityGuard());

    await waitFor(() => {
      expect(result.current).toEqual({
        rooted: true,
        emulator: true,
        developerMode: true,
        blocked: true,
      });
    });
  });

  it("falls back to a safe status when detection fails and does not rerun on rerender", async () => {
    mockDetectDeviceSecurityStatus.mockRejectedValueOnce(new Error("permission denied"));
    const { result, rerender } = await renderHook(() => useSecurityGuard());

    await waitFor(() => {
      expect(result.current).toEqual({
        rooted: false,
        emulator: false,
        developerMode: false,
        blocked: false,
      });
    });

    await rerender(undefined);
    expect(mockDetectDeviceSecurityStatus).toHaveBeenCalledTimes(1);
  });

  it("keeps the latest resolved status after unmount-safe completion", async () => {
    let resolveStatus!: (value: any) => void;
    mockDetectDeviceSecurityStatus.mockReturnValueOnce(new Promise((resolve) => { resolveStatus = resolve; }));

    const { result } = await renderHook(() => useSecurityGuard());

    expect(result.current).toBeNull();

    await act(async () => {
      resolveStatus({
        rooted: false,
        emulator: true,
        developerMode: false,
        blocked: false,
      });
      await Promise.resolve();
    });

    expect(result.current).toEqual({
      rooted: false,
      emulator: true,
      developerMode: false,
      blocked: false,
    });
  });
});
