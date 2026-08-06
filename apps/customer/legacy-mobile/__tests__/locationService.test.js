import AsyncStorage from "@react-native-async-storage/async-storage";

const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
const mockParseError = jest.fn((_error, fallback) => fallback);

jest.mock("../src/api/client", () => ({
  api: mockApi,
  parseApiError: (...args) => mockParseError(...args),
}));
jest.mock("../src/utils/retry", () => ({
  withRetry: (fn) => fn(),
}));

describe("locationService", () => {
  let service;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    global.fetch = jest.fn();
    service = require("../src/services/locationService");
  });

  it("performs location and address CRUD with normalized payloads", async () => {
    mockApi.post
      .mockResolvedValueOnce({ data: { updated: true } })
      .mockResolvedValueOnce({ data: { id: "1" } });
    mockApi.put.mockResolvedValueOnce({ data: { id: "1", updated: true } });
    mockApi.get
      .mockResolvedValueOnce({ data: { id: "current" } })
      .mockResolvedValueOnce({ data: [{ id: "1" }] });
    mockApi.patch.mockResolvedValueOnce({ data: { default: true } });
    mockApi.delete.mockResolvedValueOnce({ data: { deleted: true } });

    await expect(service.updateCurrentLocation({ latitude: 1, longitude: 2 })).resolves.toEqual({ updated: true });
    await expect(service.saveAddress({ label: "HOME", addressLine: "Area", latitude: 1, longitude: 2 })).resolves.toEqual({ id: "1" });
    await expect(service.updateAddress({ id: "a b", label: "OTHER", addressLine: "Area" })).resolves.toMatchObject({ updated: true });
    await expect(service.getCurrentAddress(9)).resolves.toEqual({ id: "current" });
    await expect(service.getAllAddresses(9, { page: "2", size: "10", search: " home " })).resolves.toEqual([{ id: "1" }]);
    await expect(service.setDefaultAddress("1")).resolves.toEqual({ default: true });
    await expect(service.deleteAddress("1")).resolves.toEqual({ deleted: true });

    expect(mockApi.put).toHaveBeenCalledWith(
      "/api/v1/customer/location/address/a%20b",
      expect.objectContaining({ id: "a b", country: "India" }),
    );
    expect(mockApi.get).toHaveBeenLastCalledWith(
      "/api/v1/customer/location/all",
      { params: { page: 2, size: 10, search: "home" } },
    );
  });

  it.each([
    ["updateCurrentLocation", [{ latitude: 1 }], "Failed to update location"],
    ["saveAddress", [{}], "Failed to save address"],
    ["updateAddress", [{}], "Failed to update address"],
    ["getCurrentAddress", [1], "Failed to fetch current address"],
    ["getAllAddresses", [1], "Failed to fetch addresses"],
    ["setDefaultAddress", ["1"], "Failed to set default address"],
    ["deleteAddress", ["1"], "Failed to delete address"],
  ])("normalizes %s failures", async (method, args, message) => {
    Object.values(mockApi).forEach((mock) => mock.mockRejectedValue(new Error("network")));
    await expect(service[method](...args)).rejects.toThrow(message);
  });

  it("caches reverse geocode and serviceability responses", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    mockApi.post
      .mockResolvedValueOnce({ data: { formattedAddress: "Indore" } })
      .mockResolvedValueOnce({ data: { serviceable: true } });

    await expect(service.reverseGeocode({ lat: 22.7, lng: 75.8 })).resolves.toEqual({ formattedAddress: "Indore" });
    await expect(service.reverseGeocode({ latitude: 22.7001, longitude: 75.8001 })).resolves.toEqual({ formattedAddress: "Indore" });
    await expect(service.checkServiceability({ lat: 22.7, lng: 75.8, postalCode: "452010" })).resolves.toEqual({ serviceable: true });
    await expect(service.checkServiceability({ latitude: 22.7001, longitude: 75.8001, pincode: "452010" })).resolves.toEqual({ serviceable: true });
    expect(mockApi.post).toHaveBeenCalledTimes(2);
    jest.restoreAllMocks();
  });

  it("searches backend response shapes", async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: { items: [] } } })
      .mockResolvedValueOnce({ data: { results: [{ id: "backend" }] } });
    await expect(service.searchLocations(" Indore ")).resolves.toEqual([{ id: "backend" }]);
    await expect(service.searchLocations(" ")).resolves.toEqual([]);
  });

  it("maps Nominatim and maps.co fallback results", async () => {
    mockApi.get.mockRejectedValue(new Error("backend down"));
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([
          { place_id: 7, display_name: "Indore", lat: "22.7", lon: "75.8", address: { city: "Indore", postcode: "452001" } },
        ]),
      })
      .mockResolvedValueOnce({ ok: false });
    await expect(service.searchLocations("Indore")).resolves.toEqual([
      expect.objectContaining({ id: "7", city: "Indore", latitude: 22.7 }),
    ]);

    global.fetch.mockReset();
    global.fetch
      .mockRejectedValueOnce(new Error("nominatim"))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([
          { osm_id: 8, display_name: "Bhopal", lat: "23.2", lon: "77.4", address: { town: "Bhopal" } },
        ]),
      });
    await expect(service.searchLocations("Bhopal")).resolves.toEqual([
      expect.objectContaining({ id: "8", city: "Bhopal" }),
    ]);
  });

  it("returns local city fallback or empty results after network failures", async () => {
    mockApi.get.mockRejectedValue(new Error("backend down"));
    global.fetch.mockRejectedValue(new Error("offline"));
    await expect(service.searchLocations("del")).resolves.toEqual([
      expect.objectContaining({ city: "Delhi" }),
    ]);
    await expect(service.searchLocations("unknown-place")).resolves.toEqual([]);
  });
});
