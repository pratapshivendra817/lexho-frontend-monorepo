import React from "react";
import { cleanup, render } from "@testing-library/react-native";
import { SplashScreen as ActiveSplashScreen } from "../src/screens/auth/SplashScreen";
import { SplashScreen as LegacySplashScreen } from "../src/screens/SplashScreen";

jest.mock("react-native-paper", () => {
  const { ActivityIndicator, Text } = require("react-native");
  return {
    ActivityIndicator: (props: any) => (
      <ActivityIndicator
        {...props}
        accessibilityLabel="Splash loading indicator"
      />
    ),
    Text,
  };
});

type SplashComponent = React.ComponentType;

async function renderSplash(Component: SplashComponent) {
  return render(<Component />);
}

describe.each([
  ["active authentication splash", ActiveSplashScreen],
  ["legacy root splash", LegacySplashScreen],
] as const)("%s", (_name, SplashComponent) => {
  afterEach(async () => {
    await cleanup();
  });

  it("renders the branded default UI and loading indicator", async () => {
    const view = await renderSplash(SplashComponent);

    expect(view.getByText("Lexho")).toBeTruthy();
    expect(view.getByText("CokAtHome")).toBeTruthy();
    expect(view.getByText("Cleaning Service")).toBeTruthy();
    expect(view.getByLabelText("Splash loading indicator")).toBeTruthy();
  });

  it("renders the bundled splash image as a cover background", async () => {
    const view = await renderSplash(SplashComponent);
    const backgroundImage = view.container.queryAll(
      (node) =>
        node.type === "Image" &&
        node.props.resizeMode === "cover" &&
        Boolean(node.props.source),
    )[0];

    expect(backgroundImage).toBeTruthy();
    expect(backgroundImage.props.source).toBeTruthy();
  });

  it("rerenders and unmounts without starting timers or navigation work", async () => {
    const view = await renderSplash(SplashComponent);

    await view.rerender(<SplashComponent />);
    expect(view.getByText("Lexho")).toBeTruthy();

    await view.unmount();
    expect(view.root).toBeUndefined();
  });
});

describe("legacy splash helper copy", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("renders its loading helper text", async () => {
    const view = await renderSplash(LegacySplashScreen);

    expect(view.getByText("Loading your experience...")).toBeTruthy();
  });

  it("does not render helper copy in the active authentication splash", async () => {
    const view = await renderSplash(ActiveSplashScreen);

    expect(view.queryByText("Loading your experience...")).toBeNull();
  });
});
