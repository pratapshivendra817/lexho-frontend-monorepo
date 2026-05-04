import { api, parseApiError } from "./client";
import type { BookingSummaryDto, CreateBookingRequest } from "../types/contracts";

export async function getBookingsHistory(): Promise<BookingSummaryDto[]> { try { const { data } = await api.get("/api/bookings/history"); return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as BookingSummaryDto[]; } catch (error) { throw new Error(parseApiError(error, "Failed to load bookings")); } }
export async function createBooking(payload: CreateBookingRequest) { try { const { data } = await api.post("/api/bookings/create", payload); return data as BookingSummaryDto; } catch (error) { throw new Error(parseApiError(error, "Booking failed")); } }
