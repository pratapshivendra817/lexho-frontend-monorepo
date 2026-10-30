import API, { getReadableApiError } from "./api";

export type PartnerSupportTicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type PartnerSupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type PartnerSupportMessageSender = "PARTNER" | "SUPPORT";

export type PartnerSupportMessage = {
  id?: string;
  sender: PartnerSupportMessageSender;
  message: string;
  createdAt: string;
};

export type PartnerSupportTicket = {
  id: string;
  subject: string;
  message?: string;
  status: PartnerSupportTicketStatus;
  categoryId?: string;
  bookingId?: string;
  priority?: PartnerSupportTicketPriority;
  createdAt?: string;
  updatedAt?: string;
  messages?: PartnerSupportMessage[];
};

type TicketListResponse = {
  content?: PartnerSupportTicket[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
};

const listEndpoints = ["/api/v1/partner/support/tickets", "/api/partner/support/tickets"] as const;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

const normalizeMessage = (row: unknown): PartnerSupportMessage => {
  const source = asRecord(row);
  const sender = asString(source.sender).toUpperCase();
  return {
    id: asString(source.id) || undefined,
    sender: (sender === "SUPPORT" ? "SUPPORT" : "PARTNER") as PartnerSupportMessageSender,
    message: asString(source.message),
    createdAt: asString(source.createdAt),
  };
};

const normalizeTicket = (row: unknown): PartnerSupportTicket => {
  const source = asRecord(row);
  return {
    id: asString(source.id || source.ticketId),
    subject: asString(source.subject),
    message: asString(source.message) || undefined,
    status: (asString(source.status).toUpperCase() || "OPEN") as PartnerSupportTicketStatus,
    categoryId: asString(source.categoryId) || undefined,
    bookingId: asString(source.bookingId) || undefined,
    priority: asString(source.priority).toUpperCase() as PartnerSupportTicketPriority || undefined,
    createdAt: asString(source.createdAt) || undefined,
    updatedAt: asString(source.updatedAt) || undefined,
    messages: Array.isArray(source.messages) ? source.messages.map(normalizeMessage) : undefined,
  };
};

async function requestWithFallback<T>(factory: (endpoint: string) => Promise<T>) {
  let lastError: unknown;
  for (const endpoint of listEndpoints) {
    try {
      return await factory(endpoint);
    } catch (error: any) {
      const status = Number(error?.response?.status ?? 0);
      if (status && status !== 404 && status !== 405) {
        throw new Error(getReadableApiError(error, "Unable to reach support service"));
      }
      lastError = error;
    }
  }
  throw new Error(getReadableApiError(lastError, "Unable to reach support service"));
}

export async function fetchPartnerSupportTickets(params?: {
  status?: PartnerSupportTicketStatus | "";
  page?: number;
  size?: number;
}) {
  return requestWithFallback(async (endpoint) => {
    const response = await API.get(endpoint, {
      params: {
        status: params?.status || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    });
    const root = asRecord(response.data);
    const data = asRecord(root.data) as TicketListResponse;
    const content = Array.isArray(data.content) ? data.content.map(normalizeTicket) : [];
    return {
      tickets: content,
      page: Number(data.page ?? 0),
      size: Number(data.size ?? 20),
      totalElements: Number(data.totalElements ?? content.length),
      totalPages: Number(data.totalPages ?? (content.length ? 1 : 0)),
      last: Boolean(data.last ?? true),
    };
  });
}

export async function createPartnerSupportTicket(payload: {
  subject: string;
  message: string;
  categoryId?: string;
  bookingId?: string;
  priority?: PartnerSupportTicketPriority;
}) {
  return requestWithFallback(async (endpoint) => {
    const { data } = await API.post(endpoint, payload);
    return normalizeTicket(asRecord(data).data);
  });
}

export async function fetchPartnerSupportTicketDetail(ticketId: string) {
  return requestWithFallback(async (endpoint) => {
    const { data } = await API.get(`${endpoint}/${encodeURIComponent(ticketId)}`);
    return normalizeTicket(asRecord(data).data);
  });
}
