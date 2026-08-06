const mockPost = jest.fn();
const mockParseApiError = jest.fn();
const mockWithRetry = jest.fn();

jest.mock("../src/api/client", () => ({
  api: {
    post: (...args) => mockPost(...args),
  },
  parseApiError: (...args) => mockParseApiError(...args),
}));

jest.mock("../src/utils/retry", () => ({
  withRetry: (...args) => mockWithRetry(...args),
}));

import { createBooking } from "../src/services/bookingService";

describe("bookingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWithRetry.mockImplementation((operation) => operation());
    mockParseApiError.mockImplementation((_error, fallback) => fallback);
  });

  it("posts the exact booking payload through the retry wrapper and returns response data", async () => {
    const payload = {
      userId: 7,
      serviceId: 11,
      addressId: "address-1",
      scheduledTime: "2026-06-14T10:00:00",
    };
    const responseData = { id: "booking-1", status: "CREATED" };
    mockPost.mockResolvedValueOnce({ data: responseData });

    await expect(createBooking(payload)).resolves.toBe(responseData);

    expect(mockWithRetry).toHaveBeenCalledTimes(1);
    expect(mockWithRetry).toHaveBeenCalledWith(expect.any(Function));
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith("/api/bookings", payload);
  });

  it("does not perform the network call until the retry operation is invoked", async () => {
    let retryOperation;
    mockWithRetry.mockImplementationOnce((operation) => {
      retryOperation = operation;
      return Promise.resolve({ data: { id: "deferred" } });
    });

    await expect(createBooking({ serviceId: 4 })).resolves.toEqual({
      id: "deferred",
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(retryOperation).toEqual(expect.any(Function));

    mockPost.mockResolvedValueOnce({ data: { id: "invoked" } });
    await expect(retryOperation()).resolves.toEqual({
      data: { id: "invoked" },
    });
    expect(mockPost).toHaveBeenCalledWith("/api/bookings", { serviceId: 4 });
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["false", false],
    ["zero", 0],
  ])("preserves %s response data without coercion", async (_label, data) => {
    mockPost.mockResolvedValueOnce({ data });

    await expect(createBooking({ serviceId: 1 })).resolves.toBe(data);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty object", {}],
  ])("forwards an %s payload unchanged", async (_label, payload) => {
    mockPost.mockResolvedValueOnce({ data: { accepted: true } });

    await expect(createBooking(payload)).resolves.toEqual({ accepted: true });
    expect(mockPost).toHaveBeenCalledWith("/api/bookings", payload);
  });

  it("normalizes an API rejection from inside the retry operation", async () => {
    const networkError = { response: { status: 503 }, message: "offline" };
    mockPost.mockRejectedValueOnce(networkError);
    mockParseApiError.mockReturnValueOnce("Booking service unavailable");

    await expect(createBooking({ serviceId: 3 })).rejects.toThrow(
      "Booking service unavailable",
    );

    expect(mockParseApiError).toHaveBeenCalledWith(
      networkError,
      "Failed to create booking",
    );
  });

  it("normalizes a rejection raised by the retry wrapper itself", async () => {
    const retryError = new Error("retry policy failed");
    mockWithRetry.mockRejectedValueOnce(retryError);
    mockParseApiError.mockReturnValueOnce("Failed after retries");

    await expect(createBooking({ serviceId: 5 })).rejects.toThrow(
      "Failed after retries",
    );

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockParseApiError).toHaveBeenCalledWith(
      retryError,
      "Failed to create booking",
    );
  });

  it.each([
    ["null", null, "null"],
    ["undefined", undefined, ""],
    ["empty string", "", ""],
  ])(
    "still rejects with an Error when parseApiError returns %s",
    async (_label, parsedMessage, expectedMessage) => {
      mockPost.mockRejectedValueOnce(new Error("network"));
      mockParseApiError.mockReturnValueOnce(parsedMessage);

      const promise = createBooking({});

      await expect(promise).rejects.toBeInstanceOf(Error);
      await expect(promise).rejects.toHaveProperty("message", expectedMessage);
    },
  );
});
