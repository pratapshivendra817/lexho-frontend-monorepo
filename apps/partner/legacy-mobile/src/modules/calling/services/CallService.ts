import API from "../../../services/api";

export const CallService = {
  async initiate(bookingId: number) {
    const { data } = await API.post(`/api/v1/partner/orders/${bookingId}/calls`);
    return data?.data ?? data;
  },
  accept: (callId: string) => API.post(`/api/v1/partner/calls/${encodeURIComponent(callId)}/accept`),
  reject: (callId: string, reason = "DECLINED") => API.post(`/api/v1/partner/calls/${encodeURIComponent(callId)}/reject`, { reason }),
  end: (callId: string, reason = "HANGUP") => API.post(`/api/v1/partner/calls/${encodeURIComponent(callId)}/end`, { reason }),
  missed: (callId: string) => API.post(`/api/v1/partner/calls/${encodeURIComponent(callId)}/missed`),
};
