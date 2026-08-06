import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import DashboardScreen from "../DashboardScreen";
import type { PartnerOrder } from "../../types/order";
import {
  acceptPartnerRequest,
  fetchPartnerRequests,
  rejectPartnerRequest,
} from "../../services/partnerService";

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  })),
  useRoute: jest.fn(() => ({ key: "DashboardScreen", name: "DashboardScreen", params: {} })),
}));

jest.mock("../../services/partnerService", () => ({
  fetchPartnerRequests: jest.fn(),
  acceptPartnerRequest: jest.fn(),
  rejectPartnerRequest: jest.fn(),
}));

const mockedFetchPartnerRequests = fetchPartnerRequests as jest.MockedFunction<typeof fetchPartnerRequests>;
const mockedAcceptPartnerRequest = acceptPartnerRequest as jest.MockedFunction<typeof acceptPartnerRequest>;
const mockedRejectPartnerRequest = rejectPartnerRequest as jest.MockedFunction<typeof rejectPartnerRequest>;

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const makeOrder = (overrides: Partial<PartnerOrder> = {}): PartnerOrder => ({
  id: 101,
  customerName: "Aarav Sharma",
  serviceType: "Deep Cleaning",
  amount: 799,
  status: "PENDING",
  ...overrides,
});

const renderScreen = async () =>
  render(
    <DashboardScreen
      onLogout={jest.fn(async () => undefined)}
    />,
  );

describe("DashboardScreen", () => {
  beforeEach(() => {
    mockedFetchPartnerRequests.mockReset();
    mockedAcceptPartnerRequest.mockReset();
    mockedRejectPartnerRequest.mockReset();
  });

  it("renders the initial loading state and fetches pending requests on mount", async () => {
    const pendingRequest = createDeferred<PartnerOrder[]>();
    mockedFetchPartnerRequests.mockReturnValueOnce(pendingRequest.promise);

    const view = await renderScreen();

    await waitFor(() => {
      expect(mockedFetchPartnerRequests).toHaveBeenCalledWith({
        status: "PENDING",
        page: 0,
        size: 20,
      });
    });
    expect(view.getByTestId("dashboard-list").props.refreshControl.props.refreshing).toBe(true);
    expect(view.getByTestId("dashboard-loading-indicator")).toBeTruthy();
    expect(view.queryByText("No pending requests")).toBeNull();

    await act(async () => {
      pendingRequest.resolve([]);
      await pendingRequest.promise;
    });

    await waitFor(() => {
      expect(view.queryByText("No pending requests")).not.toBeNull();
    });
  });

  it("renders service cards after a successful fetch, including fallback values", async () => {
    mockedFetchPartnerRequests.mockResolvedValueOnce([
      makeOrder(),
      makeOrder({
        id: 202,
        customerName: undefined,
        serviceType: undefined,
        amount: undefined,
      }),
    ]);

    const { findByText, getByText, getAllByText } = await renderScreen();

    expect(await findByText("Aarav Sharma")).toBeTruthy();
    expect(getByText("#101 | Deep Cleaning | INR 799")).toBeTruthy();
    expect(getAllByText("Status: PENDING")).toHaveLength(2);
    expect(getByText("Customer")).toBeTruthy();
    expect(getByText("#202 | Service | INR 0")).toBeTruthy();
    expect(getAllByText("Accept")).toHaveLength(2);
    expect(getAllByText("Reject")).toHaveLength(2);
  });

  it("renders the empty state when the API returns no pending requests", async () => {
    mockedFetchPartnerRequests.mockResolvedValueOnce([]);

    const view = await renderScreen();

    expect(await view.findByText("No pending requests")).toBeTruthy();
    expect(view.getByTestId("dashboard-list").props.refreshControl.props.refreshing).toBe(false);
  });

  it("falls back to the empty state when the fetch fails", async () => {
    mockedFetchPartnerRequests.mockRejectedValueOnce(new Error("Unable to fetch"));

    const { findByText } = await renderScreen();

    expect(await findByText("No pending requests")).toBeTruthy();
    expect(mockedFetchPartnerRequests).toHaveBeenCalledTimes(1);
  });

  it("supports pull-to-refresh and reloads the dashboard data", async () => {
    const refreshedOrders = [makeOrder({ id: 303, customerName: "Neha Singh", amount: 1199 })];
    const refreshRequest = createDeferred<PartnerOrder[]>();

    mockedFetchPartnerRequests
      .mockResolvedValueOnce([makeOrder({ id: 101 })])
      .mockReturnValueOnce(refreshRequest.promise);

    const view = await renderScreen();

    expect(await view.findByText("Aarav Sharma")).toBeTruthy();

    await act(async () => {
      view.getByTestId("dashboard-list").props.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(view.getByTestId("dashboard-list").props.refreshControl.props.refreshing).toBe(true);
    });
    expect(mockedFetchPartnerRequests).toHaveBeenCalledTimes(2);

    await act(async () => {
      refreshRequest.resolve(refreshedOrders);
      await refreshRequest.promise;
    });

    expect(await view.findByText("Neha Singh")).toBeTruthy();
    await waitFor(() => {
      expect(view.queryByText("Aarav Sharma")).toBeNull();
    });
  });

  it("accepts a request and reloads the list", async () => {
    mockedFetchPartnerRequests
      .mockResolvedValueOnce([makeOrder({ id: 404, customerName: "Riya Kapoor" })])
      .mockResolvedValueOnce([]);
    mockedAcceptPartnerRequest.mockResolvedValueOnce(undefined);

    const view = await renderScreen();

    expect(await view.findByText("Riya Kapoor")).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByText("Accept"));
    });

    await waitFor(() => {
      expect(mockedAcceptPartnerRequest).toHaveBeenCalledWith(404);
    });
    await waitFor(() => {
      expect(mockedFetchPartnerRequests).toHaveBeenCalledTimes(2);
    });
    expect(await view.findByText("No pending requests")).toBeTruthy();
  });

  it("rejects a request and reloads the list", async () => {
    mockedFetchPartnerRequests
      .mockResolvedValueOnce([makeOrder({ id: 505, customerName: "Kabir Mehta" })])
      .mockResolvedValueOnce([]);
    mockedRejectPartnerRequest.mockResolvedValueOnce(undefined);

    const view = await renderScreen();

    expect(await view.findByText("Kabir Mehta")).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByText("Reject"));
    });

    await waitFor(() => {
      expect(mockedRejectPartnerRequest).toHaveBeenCalledWith(505);
    });
    await waitFor(() => {
      expect(mockedFetchPartnerRequests).toHaveBeenCalledTimes(2);
    });
    expect(await view.findByText("No pending requests")).toBeTruthy();
  });
});
