export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketSender = "CUSTOMER" | "SUPPORT" | "ADMIN";

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
  userId?: string | number;
  subject: string;
  message: string;
  status: TicketStatus;
  categoryId?: string;
  bookingId?: string;
  priority?: TicketPriority;
  createdAt?: string;
  updatedAt?: string;
  messages: TicketMessage[];
}
