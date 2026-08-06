export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketSender = "CUSTOMER" | "PARTNER" | "SUPPORT" | "ADMIN";
export type TicketRequesterType = "CUSTOMER" | "PARTNER";

export interface TicketMessage {
  id?: string;
  sender: TicketSender;
  adminId?: number;
  message: string;
  createdAt: string;
}

export interface Ticket {
  id: string | number;
  ticketId?: string;
  requesterType?: TicketRequesterType;
  userId?: string | number;
  subject: string;
  message: string;
  status: TicketStatus;
  categoryId?: string;
  rawCategoryId?: string;
  bookingId?: string;
  priority?: TicketPriority;
  requestId?: string;
  correlationId?: string;
  createdAt?: string;
  updatedAt?: string;
  messages: TicketMessage[];
}
