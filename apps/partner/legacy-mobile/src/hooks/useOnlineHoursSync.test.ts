import { act, renderHook } from "@testing-library/react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mockOnline = false;
const mockBeginOnlineSession = jest.fn();
const mockEndOnlineSession = jest.fn();
const mockSyncOnlineHoursToBackend = jest.fn();
const mockAttachOnlineHoursLifecycle = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("./useRedux", () => ({
  useAppSelector: jest.fn((selector) => selector({ partner: { online: mockOnline } })),
}));

jest.mock("../services/onlineHoursService", () => ({
  attachOnlineHoursLifecycle: jest.fn((getOnline) => mockAttachOnlineHoursLifecycle(getOnline)),
  beginOnlineSession: jest.fn(() => mockBeginOnlineSession()),
  endOnlineSession: jest.fn(() => mockEndOnlineSession()),
  syncOnlineHoursToBackend: jest.fn(() => mockSyncOnlineHoursToBackend()),
}));

import { useOnlineHoursSync } from "./useOnlineHoursSync";

describe("useOnlineHoursSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnline = false;
    mockBeginOnlineSession.mockResolvedValue(undefined);
    mockEndOnlineSession.mockResolvedValue(undefined);
    mockSyncOnlineHoursToBackend.mockResolvedValue(undefined);
    mockAttachOnlineHoursLifecycle.mockImplementation(() => mockUnsubscribe);
  });

  it("starts an online session and registers lifecycle accessors when online", async () => {
    mockOnline = true;

    const { unmount } = await renderHook(() => useOnlineHoursSync());

    expect(mockBeginOnlineSession).toHaveBeenCalledTimes(1);
    expect(mockEndOnlineSession).not.toHaveBeenCalled();
    expect(mockAttachOnlineHoursLifecycle).toHaveBeenCalledTimes(1);
    expect(mockAttachOnlineHoursLifecycle.mock.calls[0][0]()).toBe(true);

    await unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("ends offline sessions and syncs after the promise resolves", async () => {
    let resolveEnd!: () => void;
    mockEndOnlineSession.mockReturnValueOnce(new Promise<void>((resolve) => { resolveEnd = resolve; }));

    await renderHook(() => useOnlineHoursSync());

    expect(mockEndOnlineSession).toHaveBeenCalledTimes(1);
    expect(mockSyncOnlineHoursToBackend).not.toHaveBeenCalled();

    await act(async () => {
      resolveEnd();
      await Promise.resolve();
    });

    expect(mockSyncOnlineHoursToBackend).toHaveBeenCalledTimes(1);
  });

  it("reacts to dependency changes across multiple rerenders", async () => {
    mockOnline = true;
    const { rerender } = await renderHook(() => useOnlineHoursSync());

    expect(mockBeginOnlineSession).toHaveBeenCalledTimes(1);
    expect(mockAttachOnlineHoursLifecycle.mock.calls[0][0]()).toBe(true);

    mockOnline = false;
    await rerender(undefined);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockEndOnlineSession).toHaveBeenCalledTimes(1);
    expect(mockSyncOnlineHoursToBackend).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockAttachOnlineHoursLifecycle.mock.calls[1][0]()).toBe(false);

    mockOnline = true;
    await rerender(undefined);

    expect(mockBeginOnlineSession).toHaveBeenCalledTimes(2);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    expect(mockAttachOnlineHoursLifecycle.mock.calls[2][0]()).toBe(true);
  });
});
