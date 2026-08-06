import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("axios", () => {
  const profileHttp = {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => profileHttp),
      __profileHttp: profileHttp,
    },
  };
});

jest.mock("../src/constants/env", () => ({
  API_BASE_URL: "http://api.test:8082/",
}));

import {
  deleteCustomerProfileImage,
  getCustomerProfile,
  updateCustomerProfile,
  uploadCustomerProfileImage,
  uploadProfileImageWithFetch,
} from "../src/services/profileService";
import axios from "axios";

const mockProfileHttp = axios.__profileHttp;

class MockFormData {
  constructor() {
    this.entries = [];
  }

  append(key, value) {
    this.entries.push([key, value]);
  }
}

describe("profileService", () => {
  const originalFormData = global.FormData;
  const originalFetch = global.fetch;
  const originalDev = global.__DEV__;
  const requestInterceptor = mockProfileHttp.interceptors.request.use.mock.calls[0][0];

  beforeEach(async () => {
    mockProfileHttp.get.mockReset();
    mockProfileHttp.put.mockReset();
    mockProfileHttp.post.mockReset();
    mockProfileHttp.delete.mockReset();
    await AsyncStorage.clear();
    global.FormData = MockFormData;
    global.fetch = jest.fn();
    global.__DEV__ = true;
  });

  afterAll(() => {
    global.FormData = originalFormData;
    global.fetch = originalFetch;
    global.__DEV__ = originalDev;
  });

  it("configures the profile axios client with the normalized base URL", () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: "http://api.test:8082",
      timeout: 30000,
    });
    expect(mockProfileHttp.interceptors.request.use).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it("adds bearer authentication and preserves ordinary content headers", async () => {
    await AsyncStorage.setItem("@lexho/customer/token", "customer-token");
    const config = {
      method: "put",
      baseURL: "http://api.test:8082",
      url: "/api/customer/profile",
      data: { fullName: "Customer" },
      headers: { "Content-Type": "application/json" },
    };

    await expect(requestInterceptor(config)).resolves.toBe(config);
    expect(config.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer customer-token",
      Accept: "application/json",
    });
  });

  it("uses the development internal token when no session token exists", async () => {
    const config = { headers: undefined };

    await requestInterceptor(config);

    expect(config.headers).toEqual({
      "X-Internal-Token": "LexhoInternal@2026#Admin",
      Accept: "application/json",
    });
  });

  it("omits authentication in production when storage is empty", async () => {
    global.__DEV__ = false;
    const config = { headers: {} };

    await requestInterceptor(config);

    expect(config.headers).toEqual({ Accept: "application/json" });
  });

  it("removes manually supplied multipart content headers", async () => {
    const formData = new MockFormData();
    const config = {
      method: "post",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
        "content-type": "multipart/form-data",
        Existing: "header",
      },
    };

    await requestInterceptor(config);

    expect(config.headers).toEqual({
      Existing: "header",
      "X-Internal-Token": "LexhoInternal@2026#Admin",
      Accept: "application/json",
    });
  });

  it.each([
    [
      "double nested data",
      {
        data: {
          data: {
            id: 7,
            fullName: "  Jane Doe  ",
            phoneNumber: " 9999999999 ",
            email: " jane@example.com ",
            gender: "female",
            profileImageUrl: " image.jpg ",
          },
        },
      },
    ],
    [
      "single nested data with aliases",
      {
        data: {
          id: "8",
          name: " Alias Name ",
          mobileNumber: " 8888888888 ",
          imageUrl: " alias.jpg ",
        },
      },
    ],
    [
      "raw response with mobile alias",
      {
        id: 9,
        name: "Raw Name",
        mobile: "7777777777",
      },
    ],
  ])("fetches and normalizes a %s response", async (_label, response) => {
    mockProfileHttp.get.mockResolvedValueOnce(response);

    await expect(getCustomerProfile()).resolves.toEqual(
      expect.objectContaining({
        id: String(response?.data?.data?.id ?? response?.data?.id ?? response.id),
      }),
    );
    expect(mockProfileHttp.get).toHaveBeenCalledWith("/api/customer/profile");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty object", {}],
    ["empty data", { data: null }],
  ])("returns an empty normalized profile for a %s response", async (_label, response) => {
    mockProfileHttp.get.mockResolvedValueOnce(response);

    await expect(getCustomerProfile()).resolves.toEqual({
      id: "",
      fullName: "",
      phoneNumber: "",
      email: "",
      gender: "",
      profileImageUrl: "",
    });
  });

  it("updates the profile with the exact payload and normalizes the response", async () => {
    const payload = {
      fullName: "Updated Customer",
      phoneNumber: "9999999999",
      email: "updated@example.com",
      gender: "male",
    };
    mockProfileHttp.put.mockResolvedValueOnce({
      data: {
        data: {
          id: 12,
          ...payload,
        },
      },
    });

    await expect(updateCustomerProfile(payload)).resolves.toEqual({
      id: "12",
      fullName: "Updated Customer",
      phoneNumber: "9999999999",
      email: "updated@example.com",
      gender: "MALE",
      profileImageUrl: "",
    });
    expect(mockProfileHttp.put).toHaveBeenCalledWith(
      "/api/customer/profile",
      payload,
    );
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty object", {}],
  ])("forwards an %s update payload unchanged", async (_label, payload) => {
    mockProfileHttp.put.mockResolvedValueOnce({ data: {} });

    await updateCustomerProfile(payload);

    expect(mockProfileHttp.put).toHaveBeenCalledWith(
      "/api/customer/profile",
      payload,
    );
  });

  it("uploads an image using the primary multipart field and defaults", async () => {
    mockProfileHttp.post.mockResolvedValueOnce({
      data: { id: 15, name: "Uploaded", imageUrl: "profile.jpg" },
    });

    await expect(
      uploadCustomerProfileImage({ uri: "file://profile.jpg" }),
    ).resolves.toMatchObject({
      id: "15",
      fullName: "Uploaded",
      profileImageUrl: "profile.jpg",
    });

    const [url, formData, config] = mockProfileHttp.post.mock.calls[0];
    expect(url).toBe("/api/customer/profile/image");
    expect(formData.entries).toEqual([
      [
        "image",
        {
          uri: "file://profile.jpg",
          type: "image/jpeg",
          name: "profile.jpg",
        },
      ],
    ]);
    expect(config.transformRequest[0]("raw-form-data")).toBe("raw-form-data");
  });

  it("uses supplied image metadata", async () => {
    mockProfileHttp.post.mockResolvedValueOnce({ data: {} });

    await uploadCustomerProfileImage({
      uri: "file://avatar.png",
      type: "image/png",
      name: "avatar.png",
    });

    expect(mockProfileHttp.post.mock.calls[0][1].entries).toEqual([
      [
        "image",
        {
          uri: "file://avatar.png",
          type: "image/png",
          name: "avatar.png",
        },
      ],
    ]);
  });

  it("retries image upload with the fallback file field", async () => {
    mockProfileHttp.post
      .mockRejectedValueOnce(new Error("image field unsupported"))
      .mockResolvedValueOnce({
        data: { data: { id: 16, fullName: "Fallback Upload" } },
      });

    await expect(
      uploadCustomerProfileImage({
        uri: "file://avatar.webp",
        type: "image/webp",
        name: "avatar.webp",
      }),
    ).resolves.toMatchObject({
      id: "16",
      fullName: "Fallback Upload",
    });

    expect(mockProfileHttp.post).toHaveBeenCalledTimes(2);
    expect(mockProfileHttp.post.mock.calls[1][1].entries).toEqual([
      [
        "file",
        {
          uri: "file://avatar.webp",
          type: "image/webp",
          name: "avatar.webp",
        },
      ],
    ]);
    expect(
      mockProfileHttp.post.mock.calls[1][2].transformRequest[0](
        "fallback-form-data",
      ),
    ).toBe("fallback-form-data");
  });

  it.each([
    [401, "Session expired. Please login again."],
    [413, "Image too large. Please select an image under 5 MB."],
    [500, "Fallback upload failed"],
  ])("normalizes fallback upload HTTP %s errors", async (status, message) => {
    mockProfileHttp.post
      .mockRejectedValueOnce(new Error("primary failed"))
      .mockRejectedValueOnce({
        response: {
          status,
          data: {
            message: status === 500 ? message : "backend message",
          },
        },
      });

    await expect(
      uploadCustomerProfileImage({ uri: "file://bad.jpg" }),
    ).rejects.toThrow(message);
  });

  it("uses the primary upload error when the fallback has no message", async () => {
    mockProfileHttp.post
      .mockRejectedValueOnce(new Error("Primary upload failed"))
      .mockRejectedValueOnce({});

    await expect(
      uploadCustomerProfileImage({ uri: "file://bad.jpg" }),
    ).rejects.toThrow("Primary upload failed");
  });

  it("deletes the profile image and normalizes the returned profile", async () => {
    mockProfileHttp.delete.mockResolvedValueOnce({
      data: {
        data: {
          id: 17,
          fullName: "No Image",
          profileImageUrl: "",
        },
      },
    });

    await expect(deleteCustomerProfileImage()).resolves.toMatchObject({
      id: "17",
      fullName: "No Image",
      profileImageUrl: "",
    });
    expect(mockProfileHttp.delete).toHaveBeenCalledWith(
      "/api/customer/profile/image",
    );
  });

  it.each([
    ["fetch", () => getCustomerProfile(), mockProfileHttp.get, "Failed to load profile."],
    [
      "update",
      () => updateCustomerProfile({ fullName: "Failure" }),
      mockProfileHttp.put,
      "Failed to update profile.",
    ],
    [
      "delete",
      () => deleteCustomerProfileImage(),
      mockProfileHttp.delete,
      "Failed to remove profile image.",
    ],
  ])("uses the fallback message for a message-less %s exception", async (_label, call, mock, message) => {
    mock.mockRejectedValueOnce({});

    await expect(call()).rejects.toThrow(message);
  });

  it.each([
    ["fetch", () => getCustomerProfile(), mockProfileHttp.get],
    [
      "update",
      () => updateCustomerProfile({ fullName: "Failure" }),
      mockProfileHttp.put,
    ],
    ["delete", () => deleteCustomerProfileImage(), mockProfileHttp.delete],
  ])("preserves backend messages for %s failures", async (_label, call, mock) => {
    mock.mockRejectedValueOnce({
      response: { status: 400, data: { message: "Validation failed" } },
    });

    await expect(call()).rejects.toThrow("Validation failed");
  });

  it("uploads through fetch with bearer authentication and preserves current response normalization", async () => {
    await AsyncStorage.setItem("@lexho/customer/token", "fetch-token");
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          data: {
            id: 20,
            name: "Fetch Upload",
            mobileNumber: "9999999999",
            imageUrl: "fetch.jpg",
          },
        }),
      ),
    });

    await expect(
      uploadProfileImageWithFetch({
        uri: "file://fetch.jpg",
        type: "image/jpeg",
        name: "fetch.jpg",
      }),
    ).resolves.toEqual({
      id: "",
      fullName: "",
      phoneNumber: "",
      email: "",
      gender: "",
      profileImageUrl: "",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test:8082/api/customer/profile/image",
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer fetch-token",
        },
        body: expect.any(MockFormData),
      }),
    );
  });

  it("uses development authentication and default image metadata for fetch upload", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(""),
    });

    await expect(
      uploadProfileImageWithFetch({ uri: "file://default.jpg" }),
    ).resolves.toEqual({
      id: "",
      fullName: "",
      phoneNumber: "",
      email: "",
      gender: "",
      profileImageUrl: "",
    });

    const request = global.fetch.mock.calls[0][1];
    expect(request.headers).toEqual({
      Accept: "application/json",
      "X-Internal-Token": "LexhoInternal@2026#Admin",
    });
    expect(request.body.entries).toEqual([
      [
        "image",
        {
          uri: "file://default.jpg",
          type: "image/jpeg",
          name: "profile.jpg",
        },
      ],
    ]);
  });

  it("omits fetch authentication in production without a token", async () => {
    global.__DEV__ = false;
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue("{}"),
    });

    await uploadProfileImageWithFetch({ uri: "file://profile.jpg" });

    expect(global.fetch.mock.calls[0][1].headers).toEqual({
      Accept: "application/json",
    });
  });

  it("normalizes flat JSON and malformed JSON fetch responses to an empty profile", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            id: 21,
            fullName: "Flat Upload",
            phoneNumber: "123",
          }),
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue("not-json"),
      });

    await expect(
      uploadProfileImageWithFetch({ uri: "file://flat.jpg" }),
    ).resolves.toMatchObject({ id: "", fullName: "", phoneNumber: "" });
    await expect(
      uploadProfileImageWithFetch({ uri: "file://malformed.jpg" }),
    ).resolves.toMatchObject({ id: "", fullName: "" });
  });

  it.each([
    [400, "Invalid image", "Upload failed (400): Invalid image"],
    [500, "", "Upload failed (500): Unknown error"],
  ])("rejects unsuccessful fetch uploads with status %s", async (status, body, message) => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status,
      text: jest.fn().mockResolvedValue(body),
    });

    await expect(
      uploadProfileImageWithFetch({ uri: "file://bad.jpg" }),
    ).rejects.toThrow(message);
  });

  it("propagates storage and network exceptions from fetch upload", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(
      new Error("storage unavailable"),
    );
    await expect(
      uploadProfileImageWithFetch({ uri: "file://bad.jpg" }),
    ).rejects.toThrow("storage unavailable");

    global.fetch.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(
      uploadProfileImageWithFetch({ uri: "file://bad.jpg" }),
    ).rejects.toThrow("network unavailable");
  });

  it("uses an empty base URL when API_BASE_URL is empty", () => {
    jest.resetModules();
    jest.doMock("../src/constants/env", () => ({ API_BASE_URL: "" }));
    const isolatedAxios = require("axios").default;
    isolatedAxios.create.mockClear();

    require("../src/services/profileService");

    expect(isolatedAxios.create).toHaveBeenCalledWith({
      baseURL: "",
      timeout: 30000,
    });
  });
});
