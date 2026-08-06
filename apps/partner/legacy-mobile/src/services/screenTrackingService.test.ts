globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockTrackScreenView = jest.fn();
const mockNavigationRef = {
  isReady: jest.fn(),
  getRootState: jest.fn(),
};

jest.mock("@react-navigation/native", () => ({
  createNavigationContainerRef: jest.fn(() => mockNavigationRef),
}));

jest.mock("./firebaseAnalytics", () => ({
  trackScreenView: jest.fn((...args) => mockTrackScreenView(...args)),
}));

describe("screenTrackingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  const loadService = () => require("./screenTrackingService") as typeof import("./screenTrackingService");

  it("exports the shared navigation ref and skips tracking when navigation is not ready", async () => {
    mockNavigationRef.isReady.mockReturnValue(false);

    const service = loadService();
    expect(service.navigationTrackingRef).toBe(mockNavigationRef as any);

    await service.handleNavigationStateChange();

    expect(mockNavigationRef.getRootState).not.toHaveBeenCalled();
    expect(mockTrackScreenView).not.toHaveBeenCalled();
  });

  it("tracks the nested active route only when it changes", async () => {
    mockNavigationRef.isReady.mockReturnValue(true);
    mockNavigationRef.getRootState
      .mockReturnValueOnce({
        index: 0,
        routes: [
          {
            name: "MainTabs",
            state: {
              index: 1,
              routes: [{ name: "Home" }, { name: "Orders" }],
            },
          },
        ],
      })
      .mockReturnValueOnce({
        index: 0,
        routes: [
          {
            name: "MainTabs",
            state: {
              index: 1,
              routes: [{ name: "Home" }, { name: "Orders" }],
            },
          },
        ],
      })
      .mockReturnValueOnce({
        index: 0,
        routes: [{ name: "Profile" }],
      });

    const service = loadService();

    await service.handleNavigationStateChange();
    await service.handleNavigationStateChange();
    await service.handleNavigationStateChange();

    expect(mockTrackScreenView).toHaveBeenCalledTimes(2);
    expect(mockTrackScreenView).toHaveBeenNthCalledWith(1, "Orders");
    expect(mockTrackScreenView).toHaveBeenNthCalledWith(2, "Profile");
  });

  it("skips tracking when there is no active route name", async () => {
    mockNavigationRef.isReady.mockReturnValue(true);
    mockNavigationRef.getRootState.mockReturnValueOnce({ index: 0, routes: [] });

    const service = loadService();

    await service.handleNavigationStateChange();

    expect(mockTrackScreenView).not.toHaveBeenCalled();
  });

  it("uses index zero by default and skips unnamed routes", async () => {
    mockNavigationRef.isReady.mockReturnValue(true);
    mockNavigationRef.getRootState
      .mockReturnValueOnce({
        routes: [{ name: "FallbackHome" }],
      })
      .mockReturnValueOnce({
        routes: [{}],
      });

    const service = loadService();

    await service.handleNavigationStateChange();
    await service.handleNavigationStateChange();

    expect(mockTrackScreenView).toHaveBeenCalledTimes(1);
    expect(mockTrackScreenView).toHaveBeenCalledWith("FallbackHome");
  });
});
