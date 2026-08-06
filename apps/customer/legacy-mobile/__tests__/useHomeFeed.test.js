const mockUseQuery = jest.fn();
const mockFetchHomeFeed = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args) => mockUseQuery(...args),
}));
jest.mock("../src/api/homeapi", () => ({
  fetchHomeFeed: (...args) => mockFetchHomeFeed(...args),
}));

import { renderHook } from "@testing-library/react-native";
import { useHomeFeed } from "../src/hooks/useHomeFeed";

describe("useHomeFeed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });
  });

  it("configures and returns the home-feed query", async () => {
    const { result } = await renderHook(() => useHomeFeed());

    expect(result.current).toEqual({
      data: null,
      isLoading: true,
      error: null,
    });
    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ["home-feed"],
      queryFn: expect.any(Function),
    });
  });

  it("uses the home API query function and propagates rejection", async () => {
    const error = new Error("offline");
    mockFetchHomeFeed.mockRejectedValue(error);
    await renderHook(() => useHomeFeed());
    const options = mockUseQuery.mock.calls[0][0];

    await expect(options.queryFn()).rejects.toBe(error);
  });
});
