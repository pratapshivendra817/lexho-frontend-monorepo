const mockUseQuery = jest.fn();
const mockFetchBookings = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args) => mockUseQuery(...args),
}));
jest.mock("../src/api/homeapi", () => ({
  fetchBookings: (...args) => mockFetchBookings(...args),
}));

import { renderHook } from "@testing-library/react-native";
import { useBookings } from "../src/hooks/useBookings";

describe("useBookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it("configures the bookings query and returns its state", async () => {
    const { result } = await renderHook(() => useBookings());

    expect(result.current).toEqual({
      data: [],
      isLoading: false,
      error: null,
    });
    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ["bookings"],
      queryFn: expect.any(Function),
    });
  });

  it("forwards loading and error query state unchanged", async () => {
    const state = {
      data: undefined,
      isLoading: false,
      error: new Error("failed"),
    };
    mockUseQuery.mockReturnValue(state);

    const { result } = await renderHook(() => useBookings());

    expect(result.current).toEqual(state);
  });

  it("uses the API function as the query function", async () => {
    mockFetchBookings.mockResolvedValue([{ id: "booking-1" }]);
    mockUseQuery.mockReturnValue({});
    await renderHook(() => useBookings());
    const options = mockUseQuery.mock.calls.at(-1)[0];

    await expect(options.queryFn()).resolves.toEqual([
      { id: "booking-1" },
    ]);
    expect(mockFetchBookings).toHaveBeenCalledTimes(1);
  });
});
