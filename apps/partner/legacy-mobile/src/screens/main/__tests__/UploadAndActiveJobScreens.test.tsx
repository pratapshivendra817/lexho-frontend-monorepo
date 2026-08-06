import React from "react";
import { Alert, Linking } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import ActiveJobScreen from "../ActiveJobScreen";
import DocumentUploadScreen from "../DocumentUploadScreen";
import {
  completeOrder,
  getPartnerOrderById,
  startOrder,
  uploadPartnerDocuments,
} from "../../../services/partnerService";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

const mockToast = jest.fn();
const mockShowLoader = jest.fn();
const mockHideLoader = jest.fn();

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast, showLoader: mockShowLoader, hideLoader: mockHideLoader }),
}));

jest.mock("../../../services/partnerService", () => ({
  completeOrder: jest.fn(),
  getPartnerOrderById: jest.fn(),
  startOrder: jest.fn(),
  uploadPartnerDocuments: jest.fn(),
}));

jest.mock("react-native-image-picker", () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock("../../../features/shift/locationTrackingManager", () => ({
  setTrackingContext: jest.fn(),
}));

jest.mock("../../../components/common/OrderLifecycleTimeline", () => ({
  OrderLifecycleTimeline: () => null,
}));

jest.mock("../../../services/firebaseAnalytics", () => ({
  PARTNER_ANALYTICS_EVENTS: { orderStarted: "orderStarted", orderCompleted: "orderCompleted" },
  trackEvent: jest.fn(),
}));

describe("upload and active job screens", () => {
  jest.setTimeout(15000);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    (getPartnerOrderById as jest.Mock).mockResolvedValue({
      id: 22,
      status: "ACCEPTED",
      customerName: "Riya",
      address: "Dwarka",
      latitude: 28.61,
      longitude: 77.2,
    });
    (startOrder as jest.Mock).mockResolvedValue(undefined);
    (completeOrder as jest.Mock).mockResolvedValue(undefined);
    (uploadPartnerDocuments as jest.Mock).mockImplementation((_payload, onProgress) => {
      onProgress(100);
      return Promise.resolve(undefined);
    });
    (launchCamera as jest.Mock).mockResolvedValue({
      assets: [{ uri: "file://aadhaar.jpg", type: "image/jpeg", fileName: "aadhaar.jpg", fileSize: 1024 }],
    });
    (launchImageLibrary as jest.Mock).mockResolvedValue({
      assets: [{ uri: "file://job.jpg", type: "image/jpeg", fileName: "job.jpg", fileSize: 1024 }],
    });
  });

  it("uploads required onboarding documents", async () => {
    const view = await render(<DocumentUploadScreen />);

    fireEvent.press((await view.findAllByText("Camera"))[0]);
    fireEvent.press((await view.findAllByText("Camera"))[1]);
    fireEvent.press((await view.findAllByText("Camera"))[2]);

    await waitFor(() => {
      expect(view.getAllByText("aadhaar.jpg").length).toBeGreaterThan(0);
    });

    fireEvent.press(await view.findByText("Upload Documents"));

    await waitFor(() => {
      expect(uploadPartnerDocuments).toHaveBeenCalled();
    });
    expect(mockShowLoader).toHaveBeenCalled();
    expect(mockHideLoader).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Documents uploaded successfully");
  });

  it("loads active jobs and starts service without image upload buttons", async () => {
    const navigation = { navigate: jest.fn() };
    const view = await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={navigation}
      />,
    );

    expect(await view.findByText("Active Job #22")).toBeTruthy();
    expect(view.queryByText("Upload Before Image")).toBeNull();
    expect(view.queryByText("Upload After Image")).toBeNull();

    fireEvent.press(await view.findByText("Start Service"));

    await waitFor(() => {
      expect(startOrder).toHaveBeenCalledWith(22);
    });

    fireEvent.press(await view.findByText("Open Customer Location"));
    fireEvent.press(await view.findByText("Open In-App Navigation"));

    expect(Linking.openURL).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith("RouteMap", {
      orderId: 22,
      customerLatitude: 28.61,
      customerLongitude: 77.2,
    });
  });

  it("completes started jobs without requiring an after image", async () => {
    (getPartnerOrderById as jest.Mock).mockResolvedValue({
      id: 22,
      status: "STARTED",
      customerName: "Riya",
      address: "Dwarka",
      latitude: 28.61,
      longitude: 77.2,
    });

    const view = await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    expect(await view.findByText("Active Job #22")).toBeTruthy();
    expect(view.queryByText("Upload Before Image")).toBeNull();
    expect(view.queryByText("Upload After Image")).toBeNull();
    fireEvent.press(await view.findByText("Complete Service"));

    await waitFor(() => {
      expect(completeOrder).toHaveBeenCalledWith(22);
    });
  });

  it("falls back when the order fetch fails and supports pull to refresh", async () => {
    (getPartnerOrderById as jest.Mock)
      .mockRejectedValueOnce(new Error("network failed"))
      .mockResolvedValueOnce({
        id: 22,
        status: "ACCEPTED",
        customerName: "Recovered",
        address: "Dwarka",
      });

    const view = await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    expect(await view.findByText("Customer | Address unavailable")).toBeTruthy();

    const tree = view.toJSON() as any;
    await act(async () => {
      await tree.props.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(view.getByText("Recovered | Dwarka")).toBeTruthy();
    });
  });

  it("does not render before or after image upload controls", async () => {
    const view = await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    expect(await view.findByText("Active Job #22")).toBeTruthy();
    expect(view.queryByText("Upload Before Image")).toBeNull();
    expect(view.queryByText("Before image selected")).toBeNull();
    expect(view.queryByText("Upload After Image")).toBeNull();
    expect(view.queryByText("After image selected")).toBeNull();
    expect(launchImageLibrary).not.toHaveBeenCalled();
  });

  it("shows service action errors for failed start and completion requests", async () => {
    (startOrder as jest.Mock).mockRejectedValueOnce(new Error("start failed"));
    (completeOrder as jest.Mock).mockRejectedValueOnce(new Error("complete failed"));

    const startView = await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    expect(await startView.findByText("Active Job #22")).toBeTruthy();
    fireEvent.press(startView.getByText("Start Service"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Unable to start service", "start failed");
    });
    startView.unmount();

    (getPartnerOrderById as jest.Mock).mockResolvedValue({
      id: 22,
      status: "STARTED",
      customerName: "Riya",
      address: "Dwarka",
      latitude: 28.61,
      longitude: 77.2,
    });

    const completeView = await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    expect(await completeView.findByText("Active Job #22")).toBeTruthy();
    fireEvent.press(completeView.getByText("Complete Service"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Unable to complete service", "complete failed");
    });
  });
});
