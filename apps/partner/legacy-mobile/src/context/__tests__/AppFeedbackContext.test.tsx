import React from "react";
import { act, render } from "@testing-library/react-native";
import { Text, View } from "react-native";

import { AppFeedbackProvider, useAppFeedback } from "../AppFeedbackContext";

type FeedbackContextSnapshot = ReturnType<typeof useAppFeedback>;

let latestFeedback: FeedbackContextSnapshot | null = null;

function FeedbackConsumer() {
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;

  const feedback = useAppFeedback();
  latestFeedback = feedback;
  const { loading, toastMessage, toastVisible } = feedback;

  return (
    <View>
      <Text testID="child">provider-child</Text>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="toast-message">{toastMessage === "" ? "EMPTY" : toastMessage}</Text>
      <Text testID="toast-visible">{String(toastVisible)}</Text>
      <Text testID="render-count">{String(renderCountRef.current)}</Text>
    </View>
  );
}

function HookOutsideProvider() {
  useAppFeedback();
  return null;
}

class HookErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <Text testID="hook-error">{this.state.error.message}</Text>;
    }

    return this.props.children;
  }
}

describe("AppFeedbackContext", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    latestFeedback = null;
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("renders children and exposes initial context state through the provider", async () => {
    const screen = await render(
      <AppFeedbackProvider>
        <FeedbackConsumer />
      </AppFeedbackProvider>,
    );

    expect(screen.getByTestId("child").props.children).toBe("provider-child");
    expect(screen.getByTestId("loading").props.children).toBe("false");
    expect(screen.getByTestId("toast-message").props.children).toBe("EMPTY");
    expect(screen.getByTestId("toast-visible").props.children).toBe("false");
    expect(screen.getByTestId("render-count").props.children).toBe("1");
    expect(typeof latestFeedback?.showLoader).toBe("function");
    expect(typeof latestFeedback?.hideLoader).toBe("function");
    expect(typeof latestFeedback?.toast).toBe("function");
    expect(typeof latestFeedback?.dismissToast).toBe("function");
  });

  it("updates loading state when showing and hiding the loader", async () => {
    const screen = await render(
      <AppFeedbackProvider>
        <FeedbackConsumer />
      </AppFeedbackProvider>,
    );

    await act(async () => {
      latestFeedback?.showLoader();
    });
    expect((await screen.findByTestId("loading")).props.children).toBe("true");
    expect(Number((await screen.findByTestId("render-count")).props.children)).toBeGreaterThan(1);

    await act(async () => {
      latestFeedback?.hideLoader();
    });
    expect((await screen.findByTestId("loading")).props.children).toBe("false");
    expect(Number((await screen.findByTestId("render-count")).props.children)).toBeGreaterThan(2);
  });

  it("updates toast state and lets consumers dismiss it manually", async () => {
    const screen = await render(
      <AppFeedbackProvider>
      <FeedbackConsumer />
      </AppFeedbackProvider>,
    );

    await act(async () => {
      latestFeedback?.toast("Saved successfully");
    });

    expect((await screen.findByTestId("toast-message")).props.children).toBe("Saved successfully");
    expect((await screen.findByTestId("toast-visible")).props.children).toBe("true");

    await act(async () => {
      latestFeedback?.dismissToast();
    });

    expect((await screen.findByTestId("toast-visible")).props.children).toBe("false");
    expect((await screen.findByTestId("toast-message")).props.children).toBe("Saved successfully");
  });

  it("auto-hides the toast after the timeout completes", async () => {
    const screen = await render(
      <AppFeedbackProvider>
      <FeedbackConsumer />
      </AppFeedbackProvider>,
    );

    await act(async () => {
      latestFeedback?.toast("Saved successfully");
    });
    expect((await screen.findByTestId("toast-visible")).props.children).toBe("true");

    await act(async () => {
      jest.advanceTimersByTime(2200);
    });

    expect((await screen.findByTestId("toast-visible")).props.children).toBe("false");
    expect((await screen.findByTestId("toast-message")).props.children).toBe("Saved successfully");
  });

  it("throws when the custom hook is used outside the provider", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const screen = await render(
      <HookErrorBoundary>
        <HookOutsideProvider />
      </HookErrorBoundary>,
    );

    expect((await screen.findByTestId("hook-error")).props.children).toBe(
      "useAppFeedback must be used inside AppFeedbackProvider",
    );

    consoleErrorSpy.mockRestore();
  });
});
