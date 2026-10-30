import React from "react";
import { render } from "@testing-library/react-native";
import { AssignedPartnerMap } from "../src/components/booking/AssignedPartnerMap";

jest.mock("../src/constants/env", () => ({ MAPBOX_PUBLIC_TOKEN: "test-token" }));
jest.mock("@rnmapbox/maps", () => {
  const { View, Text } = require("react-native");
  return { __esModule: true, default: {
    setAccessToken: jest.fn(), StyleURL: { Dark: "dark" },
    MapView: ({ children }: any) => <View testID="partner-map">{children}</View>,
    Camera: () => null,
    PointAnnotation: ({ id, coordinate }: any) => <Text>{`${id}:${coordinate.join(",")}`}</Text>,
  } };
});

describe("AssignedPartnerMap", () => {
  it("waits when partner coordinates are missing instead of placing a fake marker", async () => {
    const view = await render(<AssignedPartnerMap booking={{ id: "1", meta: { showMap: true }, map: { enabled: true, partner: { latitude: "", longitude: "" } } }} />);
    expect(view.getByText("Waiting for partner location")).toBeTruthy();
    expect(view.queryByTestId("partner-map")).toBeNull();
  });

  it("shows the assigned partner at API coordinates without inventing customer coordinates", async () => {
    const view = await render(<AssignedPartnerMap booking={{ id: "1", meta: { showMap: true }, map: { enabled: true, partner: { latitude: 19.14, longitude: 72.8 } } }} />);
    expect(view.getByTestId("partner-map")).toBeTruthy();
    expect(view.getByText("assigned-partner:72.8,19.14")).toBeTruthy();
    expect(view.queryByText(/booking-address:/)).toBeNull();
  });

  it("respects disabled tracking even if coordinates are supplied", async () => {
    const view = await render(<AssignedPartnerMap booking={{ id: "1", meta: { showMap: false }, map: { enabled: false, partner: { latitude: 19.14, longitude: 72.8 } } }} />);
    expect(view.queryByTestId("partner-map")).toBeNull();
  });
});
