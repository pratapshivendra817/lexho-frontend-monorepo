import React from "react";
import {
  Text,
} from "react-native";
import {
  cleanup,
  fireEvent,
  render,
} from "@testing-library/react-native";

import { AvatarPicker } from "../src/modules/profile/components/AvatarPicker";
import { CustomButton } from "../src/modules/profile/components/CustomButton";
import { CustomInput } from "../src/modules/profile/components/CustomInput";
import { EmptyState } from "../src/modules/profile/components/EmptyState";
import { Loader } from "../src/modules/profile/components/Loader";
import { ProfileCard } from "../src/modules/profile/components/ProfileCard";
import { SectionListItem } from "../src/modules/profile/components/SectionListItem";

describe("modules/profile/components", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("AvatarPicker", () => {
    it("renders initials fallback and invokes gallery and camera actions", async () => {
      const onGallery = jest.fn();
      const onCamera = jest.fn();

      const view = await render(
        <AvatarPicker
          initials="SP"
          onPickFromGallery={onGallery}
          onPickFromCamera={onCamera}
        />,
      );

      expect(view.getByText("SP")).toBeTruthy();
      expect(view.queryByText("Remove")).toBeNull();

      await fireEvent.press(view.getByText("Gallery"));
      await fireEvent.press(view.getByText("Camera"));

      expect(onGallery).toHaveBeenCalledTimes(1);
      expect(onCamera).toHaveBeenCalledTimes(1);
    });

    it("uses U when initials are empty", async () => {
      const view = await render(
        <AvatarPicker
          initials=""
          onPickFromGallery={jest.fn()}
          onPickFromCamera={jest.fn()}
        />,
      );

      expect(view.getByText("U")).toBeTruthy();
    });

    it("renders remote image and remove action", async () => {
      const onRemove = jest.fn();
      const view = await render(
        <AvatarPicker
          imageUrl="https://cdn.test/avatar.png"
          initials="SP"
          onPickFromGallery={jest.fn()}
          onPickFromCamera={jest.fn()}
          onRemove={onRemove}
        />,
      );

      expect(view.queryByText("SP")).toBeNull();
      expect(
        view.container.queryAll(
          node =>
            node.props.source?.uri === "https://cdn.test/avatar.png",
        )[0]?.props.source,
      ).toEqual({ uri: "https://cdn.test/avatar.png" });

      await fireEvent.press(view.getByText("Remove"));

      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe("CustomButton", () => {
    it.each(["primary", "ghost", "danger"] as const)(
      "invokes enabled %s button",
      async variant => {
        const onPress = jest.fn();
        const view = await render(
          <CustomButton
            label={`${variant} action`}
            onPress={onPress}
            variant={variant}
          />,
        );

        const button = view.getByLabelText(`${variant} action`);
        await fireEvent.press(button);

        expect(onPress).toHaveBeenCalledTimes(1);
        expect(view.getByText(`${variant} action`)).toBeTruthy();
      },
    );

    it("disables presses while explicitly disabled", async () => {
      const onPress = jest.fn();
      const view = await render(
        <CustomButton label="Disabled" onPress={onPress} disabled />,
      );

      await fireEvent.press(view.getByLabelText("Disabled"));

      expect(onPress).not.toHaveBeenCalled();
    });

    it.each(["primary", "ghost"] as const)(
      "shows indicator and disables presses for loading %s button",
      async variant => {
        const onPress = jest.fn();
        const view = await render(
          <CustomButton
            label="Saving"
            onPress={onPress}
            loading
            variant={variant}
          />,
        );

        expect(view.queryByText("Saving")).toBeNull();

        await fireEvent.press(view.getByLabelText("Saving"));
        expect(onPress).not.toHaveBeenCalled();
      },
    );
  });

  describe("CustomInput", () => {
    it("renders and forwards text changes and input options", async () => {
      const onChangeText = jest.fn();
      const view = await render(
        <CustomInput
          label="Email"
          value="old@example.com"
          onChangeText={onChangeText}
          placeholder="name@example.com"
          keyboardType="email-address"
          multiline
        />,
      );

      const input = view.getByDisplayValue("old@example.com");
      await fireEvent.changeText(input, "new@example.com");

      expect(onChangeText).toHaveBeenCalledWith("new@example.com");
      expect(input.props.placeholder).toBe("name@example.com");
      expect(input.props.keyboardType).toBe("email-address");
      expect(input.props.multiline).toBe(true);
      expect(view.queryByText("Invalid email")).toBeNull();
    });

    it("renders validation error and disabled state", async () => {
      const view = await render(
        <CustomInput
          label="Mobile"
          value="123"
          error="Invalid mobile"
          editable={false}
          keyboardType="number-pad"
        />,
      );

      expect(view.getByText("Invalid mobile")).toBeTruthy();
      expect(view.getByDisplayValue("123").props.editable).toBe(false);
    });
  });

  describe("EmptyState", () => {
    it("renders title and subtitle without an incomplete action", async () => {
      const first = await render(
        <EmptyState
          title="No profile"
          subtitle="Complete your account"
          actionLabel="Retry"
        />,
      );

      expect(first.getByText("No profile")).toBeTruthy();
      expect(first.getByText("Complete your account")).toBeTruthy();
      expect(
        first.container.queryAll(node => typeof node.props.onPress === "function"),
      ).toHaveLength(0);

      await first.unmount();

      const second = await render(
        <EmptyState
          title="No profile"
          subtitle="Complete your account"
          onAction={jest.fn()}
        />,
      );
      expect(
        second.container.queryAll(node => typeof node.props.onPress === "function"),
      ).toHaveLength(0);
    });

    it("renders and invokes a complete action", async () => {
      const onAction = jest.fn();
      const view = await render(
        <EmptyState
          title="Profile unavailable"
          subtitle="Try again"
          actionLabel="Reload"
          onAction={onAction}
        />,
      );

      await fireEvent.press(view.getByText("Reload"));

      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  it("renders loader activity indicator", async () => {
    const view = await render(<Loader />);

    expect(view.toJSON()).not.toBeNull();
  });

  it("renders ProfileCard children", async () => {
    const view = await render(
      <ProfileCard>
        <Text>Profile content</Text>
      </ProfileCard>,
    );

    expect(view.getByText("Profile content")).toBeTruthy();
  });

  describe("SectionListItem", () => {
    it.each([
      ["Addresses", false],
      ["Delete account", true],
    ])("renders and invokes %s item", async (title, danger) => {
      const onPress = jest.fn();
      const view = await render(
        <SectionListItem
          title={title}
          icon="account"
          onPress={onPress}
          danger={danger}
        />,
      );

      await fireEvent.press(view.getByText(title));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
