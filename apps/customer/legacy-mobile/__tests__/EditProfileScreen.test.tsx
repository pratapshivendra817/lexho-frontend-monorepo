import React from "react";
import { Alert } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { EditProfileScreen } from "../src/screens/EditProfileScreen";

const mockGetCustomerProfile = jest.fn();
const mockUpdateCustomerProfile = jest.fn();
const mockUploadCustomerProfileImage = jest.fn();
const mockUploadProfileImageWithFetch = jest.fn();
const mockDeleteCustomerProfileImage = jest.fn();
const mockPickFromCamera = jest.fn();
const mockPickFromGallery = jest.fn();

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ name }: { name: string }) => <Text accessibilityLabel={`icon-${name}`}>{name}</Text>;
});

jest.mock("react-native-paper", () => {
  const { Pressable, Text, View } = require("react-native");
  return {
    Snackbar: ({ visible, children, onDismiss }: any) =>
      visible ? (
        <View>
          <Text>{children}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={onDismiss}>
            <Text>Dismiss</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

jest.mock("../src/components/GenderSelector", () => {
  const { Pressable, Text, View } = require("react-native");
  return {
    GenderSelector: ({ value, onChange, disabled }: any) => (
      <View>
        {["MALE", "FEMALE", "OTHER"].map((gender) => (
          <Pressable
            key={gender}
            accessibilityRole="button"
            accessibilityLabel={`gender-${gender}`}
            accessibilityState={{ selected: value === gender, disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={() => onChange(gender)}
          >
            <Text>{gender}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

jest.mock("../src/components/ProfileImagePicker", () => {
  const { Pressable, Text, View } = require("react-native");
  return {
    ProfileImagePicker: ({
      imageUrl,
      fullName,
      loading,
      onPickCamera,
      onPickGallery,
      onRemove,
    }: any) => (
      <View>
        <Text>{`Avatar name: ${String(fullName ?? "")}`}</Text>
        <Text>{`Avatar URL: ${String(imageUrl ?? "")}`}</Text>
        {loading ? <Text>Image loading</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Take profile photo" onPress={onPickCamera}>
          <Text>Take Photo</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose profile photo" onPress={onPickGallery}>
          <Text>Choose Photo</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Remove profile photo" onPress={onRemove}>
          <Text>Remove Photo</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock("../src/services/profileService", () => ({
  getCustomerProfile: (...args: any[]) => mockGetCustomerProfile(...args),
  updateCustomerProfile: (...args: any[]) => mockUpdateCustomerProfile(...args),
  uploadCustomerProfileImage: (...args: any[]) => mockUploadCustomerProfileImage(...args),
  uploadProfileImageWithFetch: (...args: any[]) => mockUploadProfileImageWithFetch(...args),
  deleteCustomerProfileImage: (...args: any[]) => mockDeleteCustomerProfileImage(...args),
}));

jest.mock("../src/utils/imagePicker", () => ({
  pickFromCamera: (...args: any[]) => mockPickFromCamera(...args),
  pickFromGallery: (...args: any[]) => mockPickFromGallery(...args),
}));

function profileBuilder(overrides: Record<string, unknown> = {}) {
  return {
    id: "42",
    fullName: "Shivendra Pratap",
    phoneNumber: "7999700475",
    email: "shivendra@example.com",
    gender: "MALE",
    profileImageUrl: "https://cdn.lexho.test/profile.jpg",
    ...overrides,
  };
}

function imageBuilder(overrides: Record<string, unknown> = {}) {
  return {
    uri: "file:///profile.jpg",
    type: "image/jpeg",
    name: "profile.jpg",
    size: 1024,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function renderScreen() {
  const navigation = { goBack: jest.fn() };
  const view = await render(<EditProfileScreen navigation={navigation} />);
  return { view, navigation };
}

async function waitForProfile(view: Awaited<ReturnType<typeof render>>["getByDisplayValue"]) {
  await waitFor(() => expect(view("Shivendra Pratap")).toBeTruthy());
}

describe("EditProfileScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await cleanup();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockGetCustomerProfile.mockResolvedValue(profileBuilder());
    mockUpdateCustomerProfile.mockImplementation(async (payload) => profileBuilder(payload));
    mockPickFromCamera.mockResolvedValue(imageBuilder());
    mockPickFromGallery.mockResolvedValue(imageBuilder({ uri: "file:///gallery.jpg" }));
    mockUploadCustomerProfileImage.mockResolvedValue(
      profileBuilder({ profileImageUrl: "https://cdn.lexho.test/uploaded.jpg" }),
    );
    mockUploadProfileImageWithFetch.mockResolvedValue(
      profileBuilder({ profileImageUrl: "https://cdn.lexho.test/fallback.jpg" }),
    );
    mockDeleteCustomerProfileImage.mockResolvedValue(
      profileBuilder({ profileImageUrl: "" }),
    );
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("renders the initial loading state and disables update until profile loading finishes", async () => {
    const pendingProfile = deferred<ReturnType<typeof profileBuilder>>();
    mockGetCustomerProfile.mockReturnValue(pendingProfile.promise);
    const { view } = await renderScreen();

    expect(view.getByText("Edit Profile")).toBeTruthy();
    expect(view.getByText("Keep your details up to date")).toBeTruthy();
    expect(
      view.container.queryAll((node) => node.props.accessibilityState?.disabled === true).length,
    ).toBeGreaterThan(0);

    pendingProfile.resolve(profileBuilder());
    await waitFor(() => expect(view.getByDisplayValue("Shivendra Pratap")).toBeTruthy());
  }, 15000);

  it("loads and renders existing profile fields and normalized gender", async () => {
    const { view } = await renderScreen();

    await waitForProfile(view.getByDisplayValue);
    expect(view.getByDisplayValue("shivendra@example.com")).toBeTruthy();
    expect(view.getByDisplayValue("7999700475").props.editable).toBe(false);
    expect(view.getByLabelText("gender-MALE").props.accessibilityState.selected).toBe(true);
    expect(view.getByText("Avatar URL: https://cdn.lexho.test/profile.jpg")).toBeTruthy();
  });

  it("renders empty and undefined profile fields with OTHER as the defensive gender", async () => {
    mockGetCustomerProfile.mockResolvedValue(profileBuilder({
      fullName: undefined,
      email: null,
      phoneNumber: undefined,
      gender: undefined,
      profileImageUrl: undefined,
    }));
    const { view } = await renderScreen();

    await waitFor(() => expect(view.getByPlaceholderText("Enter your name").props.value).toBe(""));
    expect(view.getByPlaceholderText("example@mail.com").props.value).toBe("");
    expect(view.getByLabelText("gender-OTHER").props.accessibilityState.selected).toBe(true);
    expect(view.getByText("Avatar URL: ")).toBeTruthy();
  });

  it("shows required and minimum-length name validation", async () => {
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    const nameInput = view.getByPlaceholderText("Enter your name");
    await fireEvent.changeText(nameInput, "");
    await fireEvent.press(view.getByText("Update"));
    await waitFor(() => expect(view.getByText("Name is required")).toBeTruthy());
    expect(mockUpdateCustomerProfile).not.toHaveBeenCalled();

    await fireEvent.changeText(nameInput, "A");
    await fireEvent.press(view.getByText("Update"));
    await waitFor(() =>
      expect(view.getByText("Name should be at least 2 characters")).toBeTruthy(),
    );
  });

  it("validates malformed email while allowing an empty optional email", async () => {
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    const emailInput = view.getByPlaceholderText("example@mail.com");
    await fireEvent.changeText(emailInput, "not-an-email");
    await fireEvent.press(view.getByText("Update"));
    await waitFor(() => expect(view.getByText("Enter a valid email")).toBeTruthy());
    expect(mockUpdateCustomerProfile).not.toHaveBeenCalled();

    await fireEvent.changeText(emailInput, "");
    await fireEvent.press(view.getByText("Update"));
    await waitFor(() => expect(mockUpdateCustomerProfile).toHaveBeenCalled());
    expect(mockUpdateCustomerProfile).toHaveBeenCalledWith(
      expect.objectContaining({ email: undefined }),
    );
  });

  it("updates name, email, and gender with normalized legacy-compatible fields", async () => {
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.changeText(view.getByPlaceholderText("Enter your name"), "  Neha   Sharma  ");
    await fireEvent.changeText(view.getByPlaceholderText("example@mail.com"), " neha@example.com ");
    await fireEvent.press(view.getByLabelText("gender-FEMALE"));
    await fireEvent.press(view.getByText("Update"));

    await waitFor(() =>
      expect(mockUpdateCustomerProfile).toHaveBeenCalledWith({
        fullName: "Neha Sharma",
        name: "Neha Sharma",
        firstName: "Neha",
        lastName: "Sharma",
        email: "neha@example.com",
        phoneNumber: "7999700475",
        gender: "FEMALE",
      }),
    );
    expect(view.getByText("Profile updated successfully")).toBeTruthy();
  });

  it("handles a single-word name and empty phone defensively", async () => {
    mockGetCustomerProfile.mockResolvedValue(profileBuilder({ phoneNumber: "" }));
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.changeText(view.getByPlaceholderText("Enter your name"), "Prince");
    await fireEvent.press(view.getByText("Update"));

    await waitFor(() =>
      expect(mockUpdateCustomerProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Prince",
          lastName: "",
          phoneNumber: undefined,
        }),
      ),
    );
  });

  it("shows saving state, disables controls, and prevents duplicate submissions", async () => {
    const pendingUpdate = deferred<ReturnType<typeof profileBuilder>>();
    mockUpdateCustomerProfile.mockReturnValue(pendingUpdate.promise);
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    const submitPromise = fireEvent.press(view.getByText("Update"));
    await waitFor(() =>
      expect(view.getByLabelText("gender-MALE").props.accessibilityState.disabled).toBe(true),
    );
    expect(
      view.container.queryAll((node) => node.props.accessibilityState?.disabled === true).length,
    ).toBeGreaterThan(0);

    pendingUpdate.resolve(profileBuilder());
    await submitPromise;
    await waitFor(() => expect(view.getByText("Profile updated successfully")).toBeTruthy());
    expect(mockUpdateCustomerProfile).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["API failure", new Error("Profile update rejected"), "Profile update rejected"],
    ["network failure", new Error("Network Error"), "Network Error"],
    ["unknown failure", "unexpected", "Please retry."],
  ])("renders %s and supports a successful retry", async (_scenario, error, message) => {
    mockUpdateCustomerProfile
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(profileBuilder());
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.press(view.getByText("Update"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Update Failed", message));

    await fireEvent.press(view.getByText("Update"));
    await waitFor(() => expect(view.getByText("Profile updated successfully")).toBeTruthy());
    expect(mockUpdateCustomerProfile).toHaveBeenCalledTimes(2);
  });

  it.each([
    [new Error("Profile unavailable"), "Profile unavailable"],
    ["unknown", "Unable to load profile."],
    [null, "Cannot read properties of null (reading 'fullName')"],
  ])("handles profile loading failure %p", async (failure, message) => {
    if (failure === null) {
      mockGetCustomerProfile.mockResolvedValue(null);
    } else {
      mockGetCustomerProfile.mockRejectedValue(failure);
    }
    const { view } = await renderScreen();

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Failed", message));
    expect(view.getByText("Edit Profile")).toBeTruthy();
  });

  it("updates the debounced avatar name after editing", async () => {
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.changeText(view.getByPlaceholderText("Enter your name"), "New Avatar Name");
    await waitFor(
      () => expect(view.getByText("Avatar name: New Avatar Name")).toBeTruthy(),
      { timeout: 1000 },
    );
  });

  it("uploads a camera image successfully", async () => {
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.press(view.getByLabelText("Take profile photo"));
    await waitFor(() =>
      expect(mockUploadCustomerProfileImage).toHaveBeenCalledWith(imageBuilder()),
    );
    expect(view.getByText("Profile photo updated")).toBeTruthy();
    expect(view.getByText("Avatar URL: https://cdn.lexho.test/uploaded.jpg")).toBeTruthy();
  });

  it("falls back to fetch upload for gallery images", async () => {
    mockUploadCustomerProfileImage.mockRejectedValue(new Error("multipart failed"));
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.press(view.getByLabelText("Choose profile photo"));
    await waitFor(() =>
      expect(mockUploadProfileImageWithFetch).toHaveBeenCalledWith(
        imageBuilder({ uri: "file:///gallery.jpg" }),
      ),
    );
    expect(view.getByText("Avatar URL: https://cdn.lexho.test/fallback.jpg")).toBeTruthy();
  });

  it("does not upload when image selection is cancelled", async () => {
    mockPickFromCamera.mockResolvedValue(null);
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.press(view.getByLabelText("Take profile photo"));
    await waitFor(() => expect(view.queryByText("Image loading")).toBeNull());
    expect(mockUploadCustomerProfileImage).not.toHaveBeenCalled();
    expect(mockUploadProfileImageWithFetch).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("Camera permission denied"), "Camera permission denied"],
    ["unknown", "Unable to upload image."],
  ])("handles image picker or upload failure %p", async (failure, message) => {
    mockPickFromCamera.mockRejectedValue(failure);
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.press(view.getByLabelText("Take profile photo"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Upload Failed", message));
    expect(view.queryByText("Image loading")).toBeNull();
  });

  it("removes the profile photo and shows confirmation", async () => {
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.press(view.getByLabelText("Remove profile photo"));
    await waitFor(() => expect(mockDeleteCustomerProfileImage).toHaveBeenCalledTimes(1));
    expect(view.getByText("Profile photo removed")).toBeTruthy();
    expect(view.getByText("Avatar URL: ")).toBeTruthy();
  });

  it.each([
    [new Error("Delete failed"), "Delete failed"],
    ["unknown", "Unable to remove profile photo."],
  ])("handles remove-photo failure %p", async (failure, message) => {
    mockDeleteCustomerProfileImage.mockRejectedValue(failure);
    const { view } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.press(view.getByLabelText("Remove profile photo"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Remove Failed", message));
  });

  it("dismisses snackbar messages and navigates back from close", async () => {
    const { view, navigation } = await renderScreen();
    await waitForProfile(view.getByDisplayValue);

    await fireEvent.press(view.getByText("Update"));
    await waitFor(() => expect(view.getByText("Profile updated successfully")).toBeTruthy());
    await fireEvent.press(view.getByLabelText("Dismiss message"));
    expect(view.queryByText("Profile updated successfully")).toBeNull();

    await fireEvent.press(view.getByLabelText("icon-close"));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
