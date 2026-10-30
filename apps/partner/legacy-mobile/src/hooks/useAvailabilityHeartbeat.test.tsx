import { act, renderHook } from "@testing-library/react-native";
import { useAvailabilityHeartbeat } from "./useAvailabilityHeartbeat";
import { detectAndSyncCurrentLocation } from "../services/locationTrackingService";
import { setPartnerAvailabilityApi } from "../features/shift/shiftApi";

let mockOnline = true;
const mockDispatch = jest.fn();
jest.mock("./useRedux", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (select: any) => select({ partner: { online: mockOnline } }),
}));
jest.mock("../services/locationTrackingService", () => ({ detectAndSyncCurrentLocation: jest.fn() }));
jest.mock("../features/shift/shiftApi", () => ({ setPartnerAvailabilityApi: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockOnline = true;
  (detectAndSyncCurrentLocation as jest.Mock).mockResolvedValue({});
  (setPartnerAvailabilityApi as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());

it("sends stationary heartbeats while online and stops when switched offline", async () => {
  const view = await renderHook(() => useAvailabilityHeartbeat());
  await act(async () => { await jest.advanceTimersByTimeAsync(90000); });
  expect(detectAndSyncCurrentLocation).toHaveBeenCalledTimes(3);
  expect(detectAndSyncCurrentLocation).toHaveBeenCalledWith(true);
  mockOnline = false;
  await view.rerender({});
  await act(async () => { await jest.advanceTimersByTimeAsync(90000); });
  expect(detectAndSyncCurrentLocation).toHaveBeenCalledTimes(3);
  await view.unmount();
});

it("keeps the partner online until the user manually goes offline, even after repeated GPS sync failures", async () => {
  (detectAndSyncCurrentLocation as jest.Mock).mockRejectedValue(new Error("offline"));
  const view = await renderHook(() => useAvailabilityHeartbeat());
  await act(async () => { await jest.advanceTimersByTimeAsync(60000); });
  expect(setPartnerAvailabilityApi).not.toHaveBeenCalled();
  await act(async () => { await jest.advanceTimersByTimeAsync(30000); });
  expect(setPartnerAvailabilityApi).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
  await act(async () => { await jest.advanceTimersByTimeAsync(60000); });
  expect(detectAndSyncCurrentLocation).toHaveBeenCalled();
  expect(detectAndSyncCurrentLocation.mock.calls.length).toBeGreaterThanOrEqual(3);
  await view.unmount();
});

it("keeps the partner online when GPS recovers from a temporary failure", async () => {
  (detectAndSyncCurrentLocation as jest.Mock)
    .mockRejectedValueOnce(new Error("GPS timeout"))
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error("Network timeout"));
  const view = await renderHook(() => useAvailabilityHeartbeat());
  await act(async () => { await jest.advanceTimersByTimeAsync(90000); });
  expect(setPartnerAvailabilityApi).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
  await view.unmount();
});
