import React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

const mockScrollToIndex = jest.fn();

jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const ReactModule = require("react");
  const FlatList = ReactModule.forwardRef(({ data = [], renderItem, ...props }: any, ref: any) => {
    const { View } = require("react-native");
    ReactModule.useImperativeHandle(ref, () => ({ scrollToIndex: mockScrollToIndex }));
    return (
      <View testID="flat-list" data={data} renderItem={renderItem} {...props}>
        {data.map((item: any, index: number) => (
          <ReactModule.Fragment key={props.keyExtractor?.(item, index) ?? index}>
            {renderItem({ item, index })}
          </ReactModule.Fragment>
        ))}
      </View>
    );
  });
  return { __esModule: true, default: FlatList };
});

import { AddressCard } from "../src/components/AddressCard";
import { BannerCarousel as OffersCarousel } from "../src/components/BannerCarousel";
import { ProfileImagePicker } from "../src/components/ProfileImagePicker";
import { ServiceCard as ApiServiceCard } from "../src/components/ServiceCard";
import { AddressSelector } from "../src/components/cart/AddressSelector";
import { CartItem } from "../src/components/cart/CartItem";
import { CartSummary } from "../src/components/cart/CartSummary";
import { AddressSelectionSheet } from "../src/components/location/AddressSelectionSheet";
import { ServiceCard as HomeServiceCard } from "../src/components/home/ServiceCard";
import { ServiceCard as GridServiceCard } from "../src/components/service/ServiceCard";

const imagePickerStyles = new Proxy({}, { get: () => ({}) });

describe("data-driven components", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it("renders API ServiceCard details and optional add action", async () => {
    const onPress = jest.fn();
    const onAdd = jest.fn();
    const view = await render(
      <ApiServiceCard
        service={{ id: "1", name: "Deep Cleaning", description: "Whole home", price: 799 } as any}
        onPress={onPress}
        onAdd={onAdd}
      />,
    );
    expect(view.getByText("Deep Cleaning")).toBeTruthy();
    expect(view.getByText("Whole home")).toBeTruthy();
    await fireEvent.press(view.getByText("Add"));
    expect(onAdd).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByText("Deep Cleaning"));
    expect(onPress).toHaveBeenCalledTimes(1);

    await view.rerender(<ApiServiceCard service={{ id: "2", name: "Cooking", price: 300 } as any} />);
    expect(view.queryByText("Add")).toBeNull();
    expect(view.queryByText("Whole home")).toBeNull();
  });

  it("renders grid service image metadata and isolates add from card press", async () => {
    const onPress = jest.fn();
    const onAdd = jest.fn();
    const view = await render(
      <GridServiceCard
        item={{ id: 9, name: "Bathroom", imageUrl: "https://cdn/image.jpg", isNew: true, ratingLabel: "* 4.8 reviews", discountedPriceLabel: "Rs 199", originalPriceLabel: "Rs 299" }}
        imageRequestHeaders={{ Authorization: "Bearer test" }}
        onPress={onPress}
        onAdd={onAdd}
        isAdded
      />,
    );
    expect(view.getByText("NEW")).toBeTruthy();
    expect(view.getByText("4.8")).toBeTruthy();
    expect(view.container.queryAll(node => node.props.source?.uri === "https://cdn/image.jpg")[0].props.source).toEqual({ uri: "https://cdn/image.jpg", headers: { Authorization: "Bearer test" } });
    await fireEvent.press(view.getByLabelText("Add service"));
    expect(onAdd).toHaveBeenCalledWith(9);
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent.press(view.getByText("Bathroom"));
    expect(onPress).toHaveBeenCalledWith(9);

    await view.rerender(
      <GridServiceCard item={{ id: 10, name: "Fallback", ratingLabel: "unknown", discountedPriceLabel: "Free" }} onAdd={onAdd} />,
    );
    expect(view.getByText("0")).toBeTruthy();
    expect(view.queryByText("NEW")).toBeNull();
    expect(view.container.queryAll(node => node.props.source?.uri)).toHaveLength(0);
  });

  it("renders home service defaults and executes book/card actions", async () => {
    const onPress = jest.fn();
    const onAdd = jest.fn();
    const view = await render(
      <HomeServiceCard item={{ id: "svc", name: "Cook", ratingLabel: "rating ", priceLabel: "Rs 499" }} width={180} onPress={onPress} onAdd={onAdd} />,
    );
    expect(view.getByText("Top Rated")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("Book service"));
    await fireEvent.press(view.getByText("Cook"));
    expect(onAdd).toHaveBeenCalledWith("svc");
    expect(onPress).toHaveBeenCalledWith("svc");

    await view.rerender(
      <HomeServiceCard item={{ id: "img", name: "Clean", imageUrl: "https://cdn/clean.png", ratingLabel: "Rating 4.9", priceLabel: "Rs 99" }} width={160} badgeLabel="Popular" accentColor="red" onPress={onPress} onAdd={onAdd} />,
    );
    expect(view.getByText("4.9")).toBeTruthy();
    expect(view.container.queryAll(node => node.props.source?.uri === "https://cdn/clean.png")[0].props.source).toEqual({ uri: "https://cdn/clean.png" });
  });

  it("renders and controls cart item quantities and removal", async () => {
    const increase = jest.fn();
    const decrease = jest.fn();
    const remove = jest.fn();
    const view = await render(<CartItem item={{ itemId: 1, name: "Cleaning", quantity: 2, price: 125, totalPrice: 250 }} onIncrease={increase} onDecrease={decrease} onRemove={remove} />);
    expect(view.getByText("Rs 125.00")).toBeTruthy();
    expect(view.getByText("Total: Rs 250.00")).toBeTruthy();
    await fireEvent.press(view.getByText("+"));
    await fireEvent.press(view.getByText("-"));
    await fireEvent.press(view.getByText("Remove"));
    expect(increase).toHaveBeenCalledTimes(1);
    expect(decrease).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("enables checkout only for a complete cart", async () => {
    const checkout = jest.fn();
    const view = await render(<CartSummary grandTotal={499.5} canCheckout={false} onCheckout={checkout} />);
    expect(view.getByText("Rs 499.50")).toBeTruthy();
    expect(view.getByText("Select address and schedule to continue.")).toBeTruthy();
    await fireEvent.press(view.getByText("Ready for Booking"));
    expect(checkout).not.toHaveBeenCalled();
    await view.rerender(<CartSummary grandTotal={500} canCheckout onCheckout={checkout} />);
    await fireEvent.press(view.getByText("Ready for Booking"));
    expect(checkout).toHaveBeenCalledTimes(1);
    expect(view.queryByText("Select address and schedule to continue.")).toBeNull();
  });

  it("renders address selection metadata, error and callbacks", async () => {
    const onSelect = jest.fn();
    const view = await render(
      <AddressSelector
        addresses={[{ id: 1, fullAddress: "Home", city: "Delhi", pincode: "110001" }, { id: 2, fullAddress: "Office" }]}
        selectedAddressId={1}
        onSelect={onSelect}
      />,
    );
    expect(view.getByText("Delhi - 110001")).toBeTruthy();
    await fireEvent.press(view.getByText("Office"));
    expect(onSelect).toHaveBeenCalledWith(2);
    await view.rerender(<AddressSelector addresses={[]} selectedAddressId={null} onSelect={onSelect} showError />);
    expect(view.getByText("Please select an address to continue.")).toBeTruthy();
  });

  it("renders AddressCard defaults, dark selected state and actions", async () => {
    const onPress = jest.fn();
    const onDelete = jest.fn();
    const view = await render(<AddressCard onPress={onPress} onDelete={onDelete} />);
    expect(view.getByText("OTHER")).toBeTruthy();
    expect(view.getByText("Address not available")).toBeTruthy();
    await fireEvent.press(view.getByText("OTHER"));
    const deleteIcon = view.container.queryAll(node => node.props.name === "delete-outline")[0];
    await fireEvent.press(deleteIcon.parent!);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    await view.rerender(<AddressCard label="HOME" addressLine="Street 1" selected darkTheme />);
    expect(view.getByText("HOME")).toBeTruthy();
  });

  it("handles profile initials, image, loading and async photo actions", async () => {
    const camera = jest.fn().mockResolvedValue(undefined);
    const gallery = jest.fn().mockResolvedValue(undefined);
    const remove = jest.fn().mockResolvedValue(undefined);
    const view = await render(<ProfileImagePicker fullName="Shivendra Pratap" styles={imagePickerStyles} onPickCamera={camera} onPickGallery={gallery} onRemove={remove} />);
    expect(view.getByText("SP")).toBeTruthy();
    const edit = view.container.queryAll(node => node.props.name === "camera")[0].parent!;
    await fireEvent.press(edit);
    await fireEvent.press(view.getByText("Take Photo"));
    expect(camera).toHaveBeenCalledTimes(1);
    await fireEvent.press(edit);
    await fireEvent.press(view.getByText("Choose from Gallery"));
    expect(gallery).toHaveBeenCalledTimes(1);
    await fireEvent.press(edit);
    await fireEvent.press(view.getByText("Remove Photo"));
    expect(remove).toHaveBeenCalledTimes(1);

    await view.rerender(<ProfileImagePicker fullName="" imageUrl="https://cdn/avatar.png" loading styles={imagePickerStyles} />);
    expect(view.container.queryAll(node => node.props.source?.uri === "https://cdn/avatar.png")[0].props.source).toEqual({ uri: "https://cdn/avatar.png" });
    await fireEvent.press(view.container.queryAll(node => node.props.name === "camera")[0].parent!);
    expect(view.queryByText("Profile Photo")).toBeNull();
  });

  it("renders address sheet loading, empty, selected and management states", async () => {
    const close = jest.fn();
    const select = jest.fn();
    const manage = jest.fn();
    const view = await render(<PaperProvider><AddressSelectionSheet visible addresses={[]} loading onClose={close} onSelect={select} onManagePress={manage} /></PaperProvider>);
    expect(view.getByText("Loading addresses...")).toBeTruthy();
    await view.rerender(<PaperProvider><AddressSelectionSheet visible addresses={[]} onClose={close} onSelect={select} onManagePress={manage} /></PaperProvider>);
    expect(view.getByText("No saved addresses yet.")).toBeTruthy();
    await view.rerender(
      <PaperProvider><AddressSelectionSheet visible addresses={[{ id: 7, label: "", addressLine: "" } as any, { id: 8, label: "Work", addressLine: "Office road" } as any]} selectedAddressId={8} onClose={close} onSelect={select} onManagePress={manage} /></PaperProvider>,
    );
    expect(view.getByText("Address")).toBeTruthy();
    expect(view.getByText("No address line")).toBeTruthy();
    expect(view.getByText("Selected")).toBeTruthy();
    await fireEvent.press(view.getByText("Work"));
    await fireEvent.press(view.getByText("Manage Addresses"));
    expect(select).toHaveBeenCalledWith(8);
    expect(manage).toHaveBeenCalledTimes(1);
    const closeIcon = view.container.queryAll(node => node.props.name === "close")[0];
    await fireEvent.press(closeIcon.parent!);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("tracks unique impressions and banner click/redeem actions", async () => {
    jest.useFakeTimers();
    const click = jest.fn();
    const impression = jest.fn();
    const redeem = jest.fn();
    const banners = [{ id: "b1", title: "Offer", promoCode: "SAVE" }, { id: "b2", title: "Second" }] as any;
    const view = await render(<OffersCarousel banners={banners} onClick={click} onImpression={impression} onRedeem={redeem} />);
    const list = view.container.queryAll(node => node.props.data === banners && typeof node.props.onViewableItemsChanged === "function")[0];
    act(() => list.props.onViewableItemsChanged({ viewableItems: [{ item: banners[0] }, { item: banners[0] }, { item: {} }] }));
    expect(impression).toHaveBeenCalledTimes(1);
    expect(impression).toHaveBeenCalledWith("b1");
    await fireEvent.press(view.getByText("Offer"));
    await fireEvent.press(view.getAllByText("Redeem")[0]);
    expect(click).toHaveBeenCalledWith("b1");
    expect(redeem).toHaveBeenCalledWith("b1");

    await view.unmount();
    const empty = await render(<OffersCarousel banners={[]} onClick={click} onImpression={impression} />);
    expect(empty.toJSON()).toBeNull();
  });

});
