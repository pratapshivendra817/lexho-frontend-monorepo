import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useColorScheme } from "react-native";

const mockGetThemeMode = jest.fn();
const mockSaveThemeMode = jest.fn();

jest.mock("../src/services/storage", () => ({
  getThemeMode: (...args: unknown[]) => mockGetThemeMode(...args),
  saveThemeMode: (...args: unknown[]) => mockSaveThemeMode(...args),
}));

import { useThemeMode } from "../src/hooks/useThemeMode";

const mockUseColorScheme = useColorScheme as jest.Mock;

describe("useThemeMode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockUseColorScheme.mockReturnValue("light");
    mockGetThemeMode.mockResolvedValue(null);
    mockSaveThemeMode.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ["dark", "dark"],
    ["light", "light"],
    [null, "light"],
    [undefined, "light"],
  ])("uses %s system mode before storage loads", async (scheme, expected) => {
    mockUseColorScheme.mockReturnValue(scheme);
    let resolveSaved!: (value: null) => void;
    mockGetThemeMode.mockReturnValue(
      new Promise(resolve => {
        resolveSaved = resolve;
      }),
    );

    const { result } = await renderHook(() => useThemeMode());
    expect(result.current.mode).toBe(expected);
    expect(result.current.ready).toBe(false);

    await act(async () => resolveSaved(null));
    await waitFor(() => expect(result.current.ready).toBe(true));
  });

  it("restores a saved mode and toggles with persistence", async () => {
    mockGetThemeMode.mockResolvedValue("dark");
    const { result } = await renderHook(() => useThemeMode());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.mode).toBe("dark");

    const firstToggle = result.current.toggleMode;
    await act(async () => {
      await firstToggle();
    });
    expect(result.current.mode).toBe("light");
    expect(mockSaveThemeMode).toHaveBeenCalledWith("light");
    expect(result.current.toggleMode).not.toBe(firstToggle);

    await act(async () => {
      await result.current.toggleMode();
    });
    expect(result.current.mode).toBe("dark");
    expect(mockSaveThemeMode).toHaveBeenLastCalledWith("dark");
  });

  it("uses the fallback after storage timeout", async () => {
    jest.useFakeTimers();
    mockGetThemeMode.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useThemeMode());
    expect(result.current.ready).toBe(false);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2500);
    });
    expect(result.current.mode).toBe("light");
    expect(result.current.ready).toBe(true);
  });

  it("does not update state after unmount", async () => {
    let resolveSaved!: (value: "dark") => void;
    mockGetThemeMode.mockReturnValue(
      new Promise(resolve => {
        resolveSaved = resolve;
      }),
    );
    const { unmount } = await renderHook(() => useThemeMode());

    unmount();
    await act(async () => resolveSaved("dark"));
    expect(mockSaveThemeMode).not.toHaveBeenCalled();
  });

});
