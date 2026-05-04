import { api, parseApiError } from "./client";
import type { BookingSummaryDto, LiveLocationResponse, RescheduleBookingRequest } from "../types/contracts";

export async function getBookingDetails(id: string): Promise<BookingSummaryDto> { try { const { data } = await api.get(`/api/bookings/details/${id}`); return data as BookingSummaryDto; } catch (e) { throw new Error(parseApiError(e, 'Booking details failed')); } }
export async function cancelBooking(id: string): Promise<BookingSummaryDto> { try { const { data } = await api.put(`/api/bookings/cancel/${id}`); return data as BookingSummaryDto; } catch (e) { throw new Error(parseApiError(e, 'Cancel booking failed')); } }
export async function rescheduleBooking(id: string, payload: RescheduleBookingRequest): Promise<BookingSummaryDto> { try { const { data } = await api.put(`/api/bookings/reschedule/${id}`, payload); return data as BookingSummaryDto; } catch (e) { throw new Error(parseApiError(e, 'Reschedule booking failed')); } }
export async function getProviderLiveLocation(bookingId: string): Promise<LiveLocationResponse> { try { const { data } = await api.get(`/api/provider/live-location/${bookingId}`); return data as LiveLocationResponse; } catch (e) { throw new Error(parseApiError(e, 'Live location failed')); } }
