const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();

jest.mock("../src/services/api", () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
  },
  getReadableApiError: (error: any, fallback: string) => error?.message ?? fallback,
}));

import { getChatThreads, getOrderMessages, markOrderMessagesRead, normalizeChatMessage, sendOrderMessage } from "../src/services/chatApi";

describe("chatApi", () => {
  beforeEach(() => jest.clearAllMocks());

  it("normalizes chat threads and Spring pagination", async () => {
    mockGet.mockResolvedValue({ data: { data: { content: [{ orderId: 7, customerName: "Asha", unreadCount: 2, lastMessage: { id: 9, message: "Hi", senderType: "CUSTOMER" } }], number: 0, last: false } } });

    await expect(getChatThreads()).resolves.toMatchObject({
      page: 0,
      hasMore: true,
      items: [{ orderId: 7, customerName: "Asha", unreadCount: 2, lastMessage: { id: "9", text: "Hi" } }],
    });
  });

  it("supports alternate chat thread payload shapes and page metadata fallbacks", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          chats: [
            {
              id: "12",
              customer: { name: "Riya" },
              service: { name: "Deep Clean" },
              latestMessage: { clientId: "c-1", body: "Latest", senderRole: "partner", readAt: "now" },
            },
          ],
          totalPages: 3,
        },
      },
    });

    await expect(getChatThreads(1, 20)).resolves.toEqual({
      page: 1,
      hasMore: true,
      items: [
        {
          orderId: 12,
          customerName: "Riya",
          serviceName: "Deep Clean",
          lastMessage: expect.objectContaining({
            id: "c-1",
            clientId: "c-1",
            senderType: "PARTNER",
            status: "read",
          }),
          unreadCount: 0,
          updatedAt: undefined,
        },
      ],
    });
  });

  it("supports root array threads and default thread/message fallbacks", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          bookingId: "21",
          latestMessage: { messageId: "m9", message: "Hello" },
        },
      ],
    });

    await expect(getChatThreads(3, 1)).resolves.toEqual({
      page: 3,
      hasMore: true,
      items: [
        {
          orderId: 21,
          customerName: "Order #21",
          serviceName: undefined,
          lastMessage: expect.objectContaining({
            id: "m9",
            orderId: 21,
            senderId: undefined,
            status: "sent",
          }),
          unreadCount: 0,
          updatedAt: undefined,
        },
      ],
    });
  });

  it("sorts message history oldest first", async () => {
    mockGet.mockResolvedValue({ data: { messages: [
      { id: "2", orderId: 7, text: "new", createdAt: "2026-01-02T00:00:00Z" },
      { id: "1", orderId: 7, text: "old", createdAt: "2026-01-01T00:00:00Z" },
    ] } });

    const result = await getOrderMessages(7, 1, 2);
    expect(result.items.map(item => item.id)).toEqual(["1", "2"]);
    expect(mockGet).toHaveBeenCalledWith("/api/v1/partner/orders/7/chat/messages", { params: { page: 1, size: 2 } });
  });

  it("supports array-root message payloads and infers hasMore from count", async () => {
    mockGet.mockResolvedValue({
      data: [
        { messageId: "m2", bookingId: 7, body: "two", timestamp: "2026-01-02T00:00:00Z" },
        { messageId: "m1", bookingId: 7, body: "one", timestamp: "2026-01-01T00:00:00Z" },
      ],
    });

    await expect(getOrderMessages(7, 0, 2)).resolves.toEqual({
      page: 0,
      hasMore: true,
      items: [
        expect.objectContaining({ id: "m1", text: "one" }),
        expect.objectContaining({ id: "m2", text: "two" }),
      ],
    });
  });

  it("sends messages and marks non-empty receipt batches read", async () => {
    mockPost.mockResolvedValue({ data: { data: { id: "m1", senderType: "PARTNER", text: "Hello" } } });
    await expect(sendOrderMessage(4, "Hello", "c1")).resolves.toMatchObject({ id: "m1", orderId: 4, text: "Hello" });
    await markOrderMessagesRead(4, []);
    expect(mockPatch).not.toHaveBeenCalled();
    await markOrderMessagesRead(4, ["m1"]);
    expect(mockPatch).toHaveBeenCalledWith("/api/v1/partner/orders/4/chat/read", { messageIds: ["m1"] });
  });

  it("normalizes sent message responses from top-level payloads", async () => {
    mockPost.mockResolvedValue({ data: { messageId: "m2", bookingId: 6, body: "Sent", senderId: 77 } });
    await expect(sendOrderMessage(6, "Sent", "client-2")).resolves.toEqual(
      expect.objectContaining({
        id: "m2",
        orderId: 6,
        senderId: "77",
        text: "Sent",
      }),
    );
  });

  it("propagates readable errors for thread, message, and send failures", async () => {
    mockGet.mockRejectedValueOnce(new Error("thread fail"));
    await expect(getChatThreads()).rejects.toThrow("thread fail");

    mockGet.mockRejectedValueOnce(new Error("message fail"));
    await expect(getOrderMessages(4)).rejects.toThrow("message fail");

    mockPost.mockRejectedValueOnce(new Error("send fail"));
    await expect(sendOrderMessage(4, "Hi", "c2")).rejects.toThrow("send fail");
  });

  it("normalizes alternate backend fields", () => {
    expect(normalizeChatMessage({ messageId: 3, bookingId: 8, body: "Body", senderRole: "partner", timestamp: "now", readAt: "later" }, 1)).toMatchObject({
      id: "3", orderId: 8, text: "Body", senderType: "PARTNER", status: "read",
    });
  });

  it("handles empty arrays, default sender/status values, and generated timestamps", async () => {
    mockGet.mockResolvedValueOnce({ data: { data: { items: [] } } });
    await expect(getChatThreads(2, 5)).resolves.toEqual({ page: 2, hasMore: false, items: [] });

    const message = normalizeChatMessage({ id: 0, orderId: 9, text: null }, 9);
    expect(message).toMatchObject({
      id: "0",
      orderId: 9,
      senderType: "CUSTOMER",
      text: "",
      status: "sent",
    });
    expect(Date.parse(message.createdAt)).not.toBeNaN();
  });
});
