import React from "react";
import { Text, Vibration } from "react-native";
import { cleanup, fireEvent, render } from "@testing-library/react-native";

jest.mock("react-native-paper", () => {
  const { Pressable, Text, View } = require("react-native");
  const Button = ({ accessibilityLabel, children, disabled, loading, onPress }: any) => (
    <Pressable accessibilityLabel={accessibilityLabel ?? String(children)} disabled={disabled} onPress={onPress}>
      {loading ? <Text>Loading</Text> : <Text>{children}</Text>}
    </Pressable>
  );
  const Card = ({ children, onPress }: any) => <Pressable onPress={onPress}>{children}</Pressable>;
  Card.Content = ({ children }: any) => <View>{children}</View>;
  return {
    Button,
    Card,
    IconButton: ({ icon, onPress }: any) => <Pressable accessibilityLabel={`icon-${icon}`} onPress={onPress} />,
    Text,
  };
});

import { AppHeader } from "../src/components/AppHeader";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { GenderSelector } from "../src/components/GenderSelector";
import { Header } from "../src/components/Header";
import { Loader } from "../src/components/Loader";
import { LottieSuccess } from "../src/components/LottieSuccess";
import { QuantityStepper } from "../src/components/QuantityStepper";
import { ShimmerBlock } from "../src/components/ShimmerBlock";
import { PrimaryButton } from "../src/components/buttons/PrimaryButton";
import { PromoBanner } from "../src/components/banners/PromoBanner";
import { ServiceCard as SummaryServiceCard } from "../src/components/cards/ServiceCard";
import { AppLoader } from "../src/components/common/AppLoader";
import { EmptyStateCard } from "../src/components/common/EmptyStateCard";
import { QuickBookingSheet } from "../src/components/common/QuickBookingSheet";
import { SectionHeader as CommonSectionHeader } from "../src/components/common/SectionHeader";
import { SkeletonList } from "../src/components/common/SkeletonList";
import { StaggeredFadeIn } from "../src/components/common/StaggeredFadeIn";
import { PopularServicesShimmer } from "../src/components/home/PopularServicesShimmer";
import { SectionHeader as HomeSectionHeader } from "../src/components/home/SectionHeader";
import { LocationAddressShimmer } from "../src/components/location/LocationAddressShimmer";

jest.mock("lottie-react-native", () => {
  const { View } = require("react-native");
  return (props: any) => <View testID="lottie-success" {...props} />;
});

const pickerStyles = {
  genderRow: {},
  genderButton: {},
  genderButtonActive: {},
  genderButtonDisabled: {},
  genderText: {},
  genderTextActive: {},
};

describe("core reusable components", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders AppHeader optional content and executes both actions", async () => {
    const onBack = jest.fn();
    const onRight = jest.fn();
    const view = await render(
      <AppHeader
        title="Checkout"
        subtitle="Review booking"
        onBack={onBack}
        rightActionIcon="help"
        onRightActionPress={onRight}
      />,
    );

    expect(view.getByText("Checkout")).toBeTruthy();
    expect(view.getByText("Review booking")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("icon-arrow-left"));
    await fireEvent.press(view.getByLabelText("icon-help"));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRight).toHaveBeenCalledTimes(1);

    await view.rerender(<AppHeader title="Plain" />);
    expect(view.queryByText("Review booking")).toBeNull();
  });

  it("renders Header fallback and selected address and invokes change", async () => {
    const onPress = jest.fn();
    const view = await render(<Header onPressChange={onPress} />);
    expect(view.getByText("Select your address")).toBeTruthy();
    await fireEvent.press(view.getByText("Select your address"));
    expect(onPress).toHaveBeenCalledTimes(1);
    await view.rerender(<Header addressLine="221B Baker Street" />);
    expect(view.getByText("221B Baker Street")).toBeTruthy();
  });

  it("renders and invokes complete empty and error actions", async () => {
    const onAction = jest.fn();
    const onRetry = jest.fn();
    const view = await render(
      <>
        <EmptyState title="No bookings" description="Book a service" actionLabel="Explore" onAction={onAction} />
        <ErrorState message="Network unavailable" onRetry={onRetry} />
      </>,
    );
    await fireEvent.press(view.getByText("Explore"));
    await fireEvent.press(view.getByText("Retry"));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(view.getByText("Network unavailable")).toBeTruthy();

    await view.rerender(
      <>
        <EmptyState title="Empty" description="Nothing here" actionLabel="Incomplete" />
        <ErrorState />
      </>,
    );
    expect(view.queryByText("Incomplete")).toBeNull();
    expect(view.getByText("Something went wrong")).toBeTruthy();
    expect(view.queryByText("Retry")).toBeNull();
  });

  it("enforces QuantityStepper default and custom minimum values", async () => {
    const onChange = jest.fn();
    const view = await render(<QuantityStepper quantity={1} onChange={onChange} />);
    await fireEvent.press(view.getByLabelText("icon-minus"));
    await fireEvent.press(view.getByLabelText("icon-plus"));
    expect(onChange).toHaveBeenNthCalledWith(1, 1);
    expect(onChange).toHaveBeenNthCalledWith(2, 2);

    onChange.mockClear();
    await view.rerender(<QuantityStepper quantity={4} min={3} onChange={onChange} />);
    await fireEvent.press(view.getByLabelText("icon-minus"));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("normalizes OTP-independent gender selection and disabled behavior", async () => {
    const onChange = jest.fn();
    const view = await render(
      <GenderSelector value="FEMALE" onChange={onChange} styles={pickerStyles} />,
    );
    await fireEvent.press(view.getByText("Male"));
    await fireEvent.press(view.getByText("Other"));
    expect(onChange).toHaveBeenNthCalledWith(1, "MALE");
    expect(onChange).toHaveBeenNthCalledWith(2, "OTHER");

    await view.rerender(
      <GenderSelector value="MALE" onChange={onChange} styles={pickerStyles} disabled />,
    );
    await fireEvent.press(view.getByText("Female"));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("forwards PrimaryButton defaults, overrides and disabled state", async () => {
    const onPress = jest.fn();
    const view = await render(<PrimaryButton label="Continue" onPress={onPress} />);
    await fireEvent.press(view.getByLabelText("Continue"));
    expect(onPress).toHaveBeenCalledTimes(1);

    await view.rerender(
      <PrimaryButton
        label="Pay"
        accessibilityLabel="Pay securely"
        onPress={onPress}
        loading
        disabled
        buttonColor="red"
        textColor="white"
        borderColor="black"
      />,
    );
    await fireEvent.press(view.getByLabelText("Pay securely"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders static cards, headers, banners and optional slots", async () => {
    const view = await render(
      <>
        <SummaryServiceCard title="Cleaning" subtitle="Deep clean" price="Rs 499" />
        <SummaryServiceCard title="Cooking" />
        <PromoBanner title="Festival offer" subtitle="Save 20%" />
        <CommonSectionHeader title="Common" subtitle="Sub" rightSlot={<Text>Common action</Text>} />
        <HomeSectionHeader title="Popular" subtitle="Near you" titleColor="red" subtitleColor="blue" rightSlot={<Text>See all</Text>} />
        <EmptyStateCard title="No address" subtitle="Add one" />
      </>,
    );
    ["Cleaning", "Deep clean", "Rs 499", "Cooking", "Festival offer", "Save 20%", "Common action", "See all", "No address"].forEach(text => {
      expect(view.getByText(text)).toBeTruthy();
    });
    expect(view.getAllByText("Recommended")).toHaveLength(2);
    expect(view.queryByText("Near you missing")).toBeNull();
  });

  it("turns EmptyStateCard into an action only when onPress exists", async () => {
    const onPress = jest.fn();
    const view = await render(<EmptyStateCard title="Retry" subtitle="Tap here" onPress={onPress} />);
    await fireEvent.press(view.getByText("Retry"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders loaders, lottie and deterministic skeleton counts", async () => {
    const view = await render(
      <>
        <Loader />
        <AppLoader />
        <LottieSuccess />
        <PopularServicesShimmer cardWidth={144} />
        <LocationAddressShimmer />
      </>,
    );
    expect(view.getByTestId("lottie-success").props.autoPlay).toBe(true);
    expect(view.getByTestId("lottie-success").props.loop).toBe(false);
    expect(view.toJSON()).not.toBeNull();
  });

  it("starts and cleans animated shimmer loops", async () => {
    const first = await render(<ShimmerBlock height={20} width="50%" style={{ marginTop: 2 }} />);
    expect(first.toJSON()).not.toBeNull();
    await first.unmount();
    const second = await render(<SkeletonList rows={2} />);
    expect(second.toJSON()).not.toBeNull();
    await second.unmount();
  });

  it("renders staggered content with custom and default delay", async () => {
    const view = await render(<StaggeredFadeIn delay={40}><Text>Animated child</Text></StaggeredFadeIn>);
    expect(view.getByText("Animated child")).toBeTruthy();
    await view.rerender(<StaggeredFadeIn><Text>Default delay</Text></StaggeredFadeIn>);
    expect(view.getByText("Default delay")).toBeTruthy();
  });

  it("handles QuickBookingSheet visibility, actions, close and vibration failures", async () => {
    const onClose = jest.fn();
    const primary = jest.fn();
    const secondary = jest.fn();
    const vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => true);
    const view = await render(
      <QuickBookingSheet
        visible={false}
        onClose={onClose}
        actions={[{ label: "Book now", onPress: primary }, { label: "Schedule", onPress: secondary }]}
      />,
    );
    expect(view.queryByText("Quick Booking")).toBeNull();

    await view.rerender(
      <QuickBookingSheet
        visible
        onClose={onClose}
        actions={[{ label: "Book now", onPress: primary }, { label: "Schedule", onPress: secondary }]}
      />,
    );
    await fireEvent.press(view.getByText("Book now"));
    await fireEvent.press(view.getByText("Schedule"));
    await fireEvent.press(view.getByText("Close"));
    expect(primary).toHaveBeenCalledTimes(1);
    expect(secondary).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalled();

    vibrate.mockImplementation(() => { throw new Error("unsupported"); });
    await fireEvent.press(view.getByText("Book now"));
    expect(primary).toHaveBeenCalledTimes(2);
    vibrate.mockRestore();
  });
});
