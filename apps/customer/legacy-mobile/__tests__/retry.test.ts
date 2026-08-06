import { withRetry } from "../src/utils/retry";

describe("utils/retry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns immediately after a successful attempt", async () => {
    const operation = jest.fn().mockResolvedValue("done");

    await expect(withRetry(operation)).resolves.toBe("done");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("retries failures with an increasing standard delay", async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockResolvedValue("done");

    const result = withRetry(operation, 2, 100);
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(100);
    expect(operation).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(200);
    await expect(result).resolves.toBe("done");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("uses capped rate-limit backoff delays", async () => {
    const rateLimitError = { response: { status: 429 } };
    const operation = jest
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValue("recovered");

    const result = withRetry(operation, 3, 1);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(3000);
    await jest.advanceTimersByTimeAsync(10000);
    await jest.advanceTimersByTimeAsync(30000);

    await expect(result).resolves.toBe("recovered");
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it("throws the final failure without scheduling another delay", async () => {
    const finalError = new Error("permanent");
    const operation = jest.fn().mockRejectedValue(finalError);

    const result = withRetry(operation, 1, 25);
    const rejection = expect(result).rejects.toBe(finalError);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(25);

    await rejection;
    expect(operation).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("supports zero retries", async () => {
    const error = new Error("no retry");
    const operation = jest.fn().mockRejectedValue(error);

    await expect(withRetry(operation, 0)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
