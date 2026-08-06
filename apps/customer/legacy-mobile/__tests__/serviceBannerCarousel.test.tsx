import React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";

const mockScrollToIndex = jest.fn();

jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const ReactModule = require("react");
  const FlatList = ReactModule.forwardRef(({ data = [], renderItem, ...props }: any, ref: any) => {
    const { View } = require("react-native");
    ReactModule.useImperativeHandle(ref, () => ({ scrollToIndex: mockScrollToIndex }));
    return (
      <View testID="service-banner-list" {...props}>
        {data.map((item: any, index: number) => (
          <ReactModule.Fragment key={props.keyExtractor(item, index)}>
            {renderItem({ item, index })}
          </ReactModule.Fragment>
        ))}
      </View>
    );
  });
  return { __esModule: true, default: FlatList };
});

import { BannerCarousel } from "../src/components/service/BannerCarousel";

describe("service BannerCarousel", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it("renders image/fallback banners, routes presses, scrolling and auto-advance", async () => {
    const onPress = jest.fn();
    const banners = [
      { id: "b0" },
      { id: "b1", title: "Banner 1", imageUrl: "https://cdn/banner.jpg" },
    ];
    const view = await render(
      <BannerCarousel
        banners={banners}
        onPressBanner={onPress}
        imageRequestHeaders={{ Authorization: "test" }}
        bannerHeight={200}
      />,
    );

    expect(view.getByText("Special Offer")).toBeTruthy();
    expect(view.container.queryAll(node => node.props.source?.uri === "https://cdn/banner.jpg")[0].props.source).toEqual({
      uri: "https://cdn/banner.jpg",
      headers: { Authorization: "test" },
    });
    await fireEvent.press(view.getByText("Banner 1"));
    expect(onPress).toHaveBeenCalledWith(banners[1]);

    const list = view.getByTestId("service-banner-list");
    await act(async () => list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 720 } } }));
    await act(async () => { jest.advanceTimersByTime(3500); });
    expect(mockScrollToIndex).toHaveBeenCalledWith({ index: 0, animated: true });
  });

  it("does not start auto-scroll for one banner or when disabled", async () => {
    const one = await render(<BannerCarousel banners={[{ id: "one", title: "One" }]} onPressBanner={jest.fn()} />);
    await act(async () => { jest.advanceTimersByTime(4000); });
    expect(mockScrollToIndex).not.toHaveBeenCalled();
    await one.unmount();

    const disabled = await render(<BannerCarousel banners={[{ id: "a" }, { id: "b" }]} onPressBanner={jest.fn()} autoScroll={false} />);
    await act(async () => { jest.advanceTimersByTime(4000); });
    expect(mockScrollToIndex).not.toHaveBeenCalled();
    expect(disabled.getAllByText("Special Offer")).toHaveLength(2);
  });
});
