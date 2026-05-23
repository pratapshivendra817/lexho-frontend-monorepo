import { api, parseApiError } from "../api/client";
import { withRetry } from "../utils/retry";

export async function createBooking(payload) {
  try {
    const { data } = await withRetry(() => api.post("/api/bookings", payload));
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to create booking"));
  }
}
