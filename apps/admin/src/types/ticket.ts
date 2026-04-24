export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface Message {
  sender: "USER" | "ADMIN";
  text: string;
  time: string;
}

export interface Ticket {
  id: string;
  user: string;
  issue: string;
  status: TicketStatus;
  date: string;
  messages: Message[];
}