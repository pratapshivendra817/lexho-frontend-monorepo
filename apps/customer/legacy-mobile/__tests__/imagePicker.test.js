const mockLaunchCamera = jest.fn();
const mockLaunchImageLibrary = jest.fn();

jest.mock("react-native-image-picker", () => ({
  launchCamera: (...args) => mockLaunchCamera(...args),
  launchImageLibrary: (...args) => mockLaunchImageLibrary(...args),
}));

import { Alert, PermissionsAndroid, Platform } from "react-native";
import {
  pickFromCamera,
  pickFromGallery,
  showImagePickerActions,
} from "../src/utils/imagePicker";

describe("utils/imagePicker", () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    Object.defineProperty(Platform, "Version", {
      configurable: true,
      value: 33,
    });
    PermissionsAndroid.check = jest.fn().mockResolvedValue(true);
    PermissionsAndroid.request = jest
      .fn()
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    Alert.alert = jest.fn();
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalOS,
    });
    Object.defineProperty(Platform, "Version", {
      configurable: true,
      value: originalVersion,
    });
  });

  it("shows camera, gallery, remove, and cancel actions", () => {
    const onCamera = jest.fn();
    const onGallery = jest.fn();
    const onRemove = jest.fn();

    showImagePickerActions({ onCamera, onGallery, onRemove });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Profile Photo",
      "Choose an option",
      [
        { text: "Take Photo", onPress: onCamera },
        { text: "Choose from Gallery", onPress: onGallery },
        {
          text: "Remove Photo",
          style: "destructive",
          onPress: onRemove,
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  });

  it("returns a normalized Android camera image", async () => {
    mockLaunchCamera.mockResolvedValue({
      assets: [
        {
          uri: "file:///camera/photo.JPG",
          type: "IMAGE/JPEG",
          fileName: "photo.JPG",
          fileSize: 1024,
        },
      ],
    });

    await expect(pickFromCamera()).resolves.toEqual({
      uri: "file:///camera/photo.JPG",
      type: "image/jpeg",
      name: "photo.JPG",
      size: 1024,
    });
    expect(PermissionsAndroid.check).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    expect(mockLaunchCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: "photo",
        quality: 0.75,
        selectionLimit: 1,
      }),
    );
  });

  it("requests camera permission and rejects denial", async () => {
    PermissionsAndroid.check = jest.fn().mockResolvedValue(false);
    PermissionsAndroid.request = jest
      .fn()
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    await expect(pickFromCamera()).rejects.toThrow(
      "Camera permission denied.",
    );
    expect(mockLaunchCamera).not.toHaveBeenCalled();
  });

  it.each([
    [33, "READ_MEDIA_IMAGES"],
    [32, "READ_EXTERNAL_STORAGE"],
  ])("requests the correct Android %s gallery permission", async (version, key) => {
    Object.defineProperty(Platform, "Version", {
      configurable: true,
      value: version,
    });
    PermissionsAndroid.check = jest.fn().mockResolvedValue(false);
    mockLaunchImageLibrary.mockResolvedValue({ didCancel: true });

    await expect(pickFromGallery()).resolves.toBeNull();

    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS[key],
      expect.objectContaining({
        title: "Photos Permission",
      }),
    );
  });

  it("rejects denied gallery permission", async () => {
    PermissionsAndroid.check = jest.fn().mockResolvedValue(false);
    PermissionsAndroid.request = jest
      .fn()
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    await expect(pickFromGallery()).rejects.toThrow(
      "Photos permission denied.",
    );
  });

  it("skips permissions and strips the iOS file prefix", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [{ uri: "file:///ios/photo.png", type: "image/png" }],
    });
    jest.spyOn(Date, "now").mockReturnValueOnce(1234);

    await expect(pickFromGallery()).resolves.toEqual({
      uri: "/ios/photo.png",
      type: "image/png",
      name: "profile-1234.jpg",
      size: 0,
    });
    expect(PermissionsAndroid.check).not.toHaveBeenCalled();
  });

  it.each([
    [
      { errorCode: "camera_unavailable", errorMessage: "Camera unavailable" },
      "Camera unavailable",
    ],
    [{ errorCode: "camera_unavailable" }, "camera_unavailable"],
    [{ assets: [] }, "No image selected."],
    [
      {
        assets: [
          {
            uri: "file:///photo.gif",
            type: "image/gif",
            fileSize: 10,
          },
        ],
      },
      "Invalid image type. Allowed: JPEG, PNG, WEBP.",
    ],
    [
      {
        assets: [
          {
            uri: "file:///photo.jpg",
            type: "image/jpeg",
            fileSize: 5 * 1024 * 1024 + 1,
          },
        ],
      },
      "Image size must be less than 5 MB.",
    ],
  ])("rejects invalid picker result %#", async (result, message) => {
    mockLaunchImageLibrary.mockResolvedValue(result);

    await expect(pickFromGallery()).rejects.toThrow(message);
  });

  it("uses JPEG defaults when optional asset metadata is absent", async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [{ uri: "content://photo/1" }],
    });
    jest.spyOn(Date, "now").mockReturnValueOnce(99);

    await expect(pickFromGallery()).resolves.toEqual({
      uri: "content://photo/1",
      type: "image/jpeg",
      name: "profile-99.jpg",
      size: 0,
    });
  });
});
