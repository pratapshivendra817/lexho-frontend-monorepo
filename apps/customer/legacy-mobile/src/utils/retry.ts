export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  let lastError: unknown;
  const rateLimitBackoffMs = [3000, 10000, 30000];
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const status = (error as { response?: { status?: number } })?.response?.status;
      const waitMs = status === 429 ? rateLimitBackoffMs[Math.min(attempt, rateLimitBackoffMs.length - 1)] : delayMs * (attempt + 1);
      await new Promise<void>((resolve) => setTimeout(() => resolve(), waitMs));
    }
  }
  throw lastError;
}
