const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
const mockParseError = jest.fn((_error: unknown, fallback: string) => fallback);

jest.mock("../src/api/client", () => ({
  api: {
    get: (...args: any[]) => mockApi.get(...args),
    post: (...args: any[]) => mockApi.post(...args),
    put: (...args: any[]) => mockApi.put(...args),
    patch: (...args: any[]) => mockApi.patch(...args),
    delete: (...args: any[]) => mockApi.delete(...args),
  },
  parseApiError: (error: unknown, fallback: string) =>
    mockParseError(error, fallback),
}));

import {
  addAddress,
  deleteAddress,
  getAddressList,
  setDefaultAddress,
  updateAddress,
} from "../src/api/addressApi";

describe("addressApi compatibility contracts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses primary endpoints and maps DTO fields", async () => {
    mockApi.post.mockResolvedValue({ data: { data: { addressUuid: "1", type: "HOME", addressLine: "A", city: "Indore", isDefault: true } } });
    mockApi.get.mockResolvedValue({ data: { data: { content: [{ uuid: "2", customLabel: "WORK", flatNo: "B", city: "Bhopal" }, { city: "invalid" }] } } });
    mockApi.put.mockResolvedValue({ data: { id: "3", label: "OTHER", line1: "C" } });
    mockApi.delete.mockResolvedValue({ data: { deleted: true } });
    mockApi.patch.mockResolvedValue({ data: { default: true } });

    await expect(addAddress({ label: "HOME", line1: "A", city: "Indore" })).resolves.toMatchObject({ id: "1", line1: "A", isDefault: true });
    await expect(getAddressList()).resolves.toEqual([expect.objectContaining({ id: "2", label: "WORK", line1: "B" })]);
    await expect(updateAddress({ id: "3", label: "OTHER", line1: "C", city: "" })).resolves.toMatchObject({ id: "3" });
    await expect(deleteAddress("a b")).resolves.toEqual({ deleted: true });
    await expect(setDefaultAddress("a b")).resolves.toEqual({ default: true });
  });

  it("uses legacy fallback endpoints", async () => {
    mockApi.post.mockRejectedValueOnce(new Error("404")).mockResolvedValueOnce({ data: { data: { id: "1" } } });
    mockApi.get.mockRejectedValueOnce(new Error("404")).mockResolvedValueOnce({ data: { items: [{ id: "2" }] } });
    mockApi.put.mockRejectedValueOnce(new Error("404")).mockResolvedValueOnce({ data: { data: { id: "3" } } });
    mockApi.delete.mockRejectedValueOnce(new Error("404")).mockResolvedValueOnce({ data: { ok: true } });
    mockApi.patch.mockRejectedValueOnce(new Error("404"));
    mockApi.put.mockResolvedValueOnce({ data: { ok: true } });

    await expect(addAddress({ label: "HOME", line1: "A", city: "I" })).resolves.toMatchObject({ id: "1" });
    await expect(getAddressList()).resolves.toEqual([expect.objectContaining({ id: "2" })]);
    await expect(updateAddress({ id: "3", label: "HOME", line1: "C", city: "I" })).resolves.toMatchObject({ id: "3" });
    await expect(deleteAddress("1")).resolves.toEqual({ ok: true });
    await expect(setDefaultAddress("1")).resolves.toEqual({ ok: true });
  });

  it.each([
    ["add", () => addAddress({ label: "HOME", line1: "A", city: "I" }), "Add address failed"],
    ["list", () => getAddressList(), "Address list failed"],
    ["update", () => updateAddress({ id: "1", label: "HOME", line1: "A", city: "I" }), "Update address failed"],
    ["delete", () => deleteAddress("1"), "Delete address failed"],
    ["default", () => setDefaultAddress("1"), "Set default address failed"],
  ])("normalizes %s fallback failures", async (_name, call, message) => {
    Object.values(mockApi).forEach((mock) => mock.mockRejectedValue(new Error("down")));
    await expect(call()).rejects.toThrow(message);
  });
});
