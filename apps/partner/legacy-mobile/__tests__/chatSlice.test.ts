jest.mock("../src/services/chatApi", () => ({
  getChatThreads: jest.fn(),
  getOrderMessages: jest.fn(),
  markOrderMessagesRead: jest.fn(),
  sendOrderMessage: jest.fn(),
}));

import reducer, { addOptimisticMessage, applyReceipt, clearThreadUnread, receiveMessage, selectTotalChatUnread, setCustomerTyping } from "../src/redux/slices/chatSlice";

describe("chatSlice", () => {
  const customerMessage = {
    id: "m1", orderId: 12, senderType: "CUSTOMER" as const, text: "On my way", createdAt: "2026-01-01T10:00:00Z", status: "sent" as const,
  };

  it("creates a thread and increments unread for an incoming customer message", () => {
    const state = reducer(undefined, receiveMessage(customerMessage));
    expect(state.threads[0]).toMatchObject({ orderId: 12, unreadCount: 1 });
    expect(state.messagesByOrder["12"].items).toEqual([customerMessage]);
    expect(selectTotalChatUnread({ chat: state })).toBe(1);
  });

  it("reconciles a socket echo by clientId", () => {
    let state = reducer(undefined, addOptimisticMessage({ ...customerMessage, id: "c1", clientId: "c1", senderType: "PARTNER", status: "sending" }));
    state = reducer(state, receiveMessage({ ...customerMessage, id: "server-1", clientId: "c1", senderType: "PARTNER" }));
    expect(state.messagesByOrder["12"].items).toHaveLength(1);
    expect(state.messagesByOrder["12"].items[0].id).toBe("server-1");
  });

  it("tracks typing, receipts, and unread clearing", () => {
    let state = reducer(undefined, receiveMessage(customerMessage));
    state = reducer(state, setCustomerTyping({ orderId: 12, typing: true }));
    state = reducer(state, applyReceipt({ orderId: 12, messageIds: ["m1"], status: "read", readAt: "now" }));
    state = reducer(state, clearThreadUnread(12));
    expect(state.typingByOrder["12"]).toBe(true);
    expect(state.messagesByOrder["12"].items[0]).toMatchObject({ status: "read", readAt: "now" });
    expect(state.threads[0].unreadCount).toBe(0);
  });
});

