import { api as API } from "../../../api/client";

export const CallService = {
  async initiate(bookingId: number) {
    const { data } = await API.post(`/api/v1/customer/bookings/${bookingId}/calls`);
    return data?.data ?? data;
  },
  accept: (callId: string) => API.post(`/api/v1/customer/calls/${encodeURIComponent(callId)}/accept`),
  reject: (callId: string, reason = "DECLINED") => API.post(`/api/v1/customer/calls/${encodeURIComponent(callId)}/reject`, { reason }),
  end: (callId: string, reason = "HANGUP") => API.post(`/api/v1/customer/calls/${encodeURIComponent(callId)}/end`, { reason }),
  missed: (callId: string) => API.post(`/api/v1/customer/calls/${encodeURIComponent(callId)}/missed`),
};
