import { withRetry } from "./retry";

describe("withRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns immediately when the callback succeeds on the first attempt", async () => {
    const fn = jest.fn().mockResolvedValue("ok");

    await expect(withRetry(fn, 3, 100)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses default retry and delay values when they are omitted", async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error("retry me")).mockResolvedValueOnce("ok");
    const timeoutSpy = jest.spyOn(global, "setTimeout");

    const promise = withRetry(fn);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(600);

    await expect(promise).resolves.toBe("ok");
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 600);
  });

  it("retries with increasing delays before succeeding", async () => {
    const firstError = new Error("first");
    const secondError = new Error("second");
    const fn = jest.fn()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)
      .mockResolvedValueOnce("done");
    const timeoutSpy = jest.spyOn(global, "setTimeout");

    const promise = withRetry(fn, 2, 200);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(200);
    await jest.advanceTimersByTimeAsync(400);

    await expect(promise).resolves.toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 200);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 400);
  });

  it("throws the last error after exhausting all retries", async () => {
    const finalError = new Error("still failing");
    const fn = jest.fn().mockRejectedValue(finalError);

    const promise = withRetry(fn, 1, 150);
    const assertion = expect(promise).rejects.toThrow("still failing");
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(150);

    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
