import React from "react";
import { Linking } from "react-native";
import { cleanup, fireEvent, render } from "@testing-library/react-native";
import { LegalWebsiteScreen } from "../src/screens/compliance/LegalWebsiteScreen";

jest.mock("../src/constants/env", () => ({ WEBSITE_BASE_URL: "http://localhost:5173" }));
jest.mock("@react-navigation/native", () => ({ useFocusEffect: jest.fn() }));
jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { WebView: React.forwardRef((props: any, ref: any) => <View {...props} ref={ref} testID="legal-webview" />) };
});
jest.mock("../src/components/common/SkeletonList", () => ({ SkeletonList: () => null }));

afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

it.each(["/terms", "/privacy", "/cancellation-policy", "/about", "/manage-data"])("loads %s inside the app", async path => {
  const openURL = jest.spyOn(Linking, "openURL");
  const view = await render(<LegalWebsiteScreen route={{ params: { path } }} />);
  expect(view.getByTestId("legal-webview").props.source.uri).toBe("http://localhost:5173" + path);
  expect(openURL).not.toHaveBeenCalled();
});

it("allows retry when the page fails to load", async () => {
  const view = await render(<LegalWebsiteScreen route={{ params: { path: "/terms" } }} />);
  await fireEvent(view.getByTestId("legal-webview"), "error");
  expect(view.getByText("Could not load page")).toBeTruthy();
  await fireEvent.press(view.getByText("Could not load page"));
  expect(view.getByTestId("legal-webview")).toBeTruthy();
});
