import AsyncStorage from "@react-native-async-storage/async-storage";

const mockPost = jest.fn();
jest.mock("../src/services/api", () => ({
  __esModule: true,
  default: { post: (...args: any[]) => mockPost(...args) },
  getReadableApiError: (error: any, fallback: string) => error?.message ?? fallback,
}));

import {
  acceptPartnerCall,
  consumePendingIncomingCall,
  createPartnerCall,
  endPartnerCall,
  markPartnerCallMissed,
  parseCallPush,
  rejectPartnerCall,
  savePendingIncomingCall,
} from "../src/services/callApi";

describe("callApi", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("normalizes an outgoing call session", async () => {
    mockPost.mockResolvedValue({ data: { data: { callId: "c1", orderId: 12, customerName: "Asha" } } });
    await expect(createPartnerCall(12)).resolves.toMatchObject({ callId: "c1", orderId: 12, customerName: "Asha", direction: "outgoing" });
    expect(mockPost).toHaveBeenCalledWith("/api/v1/partner/orders/12/calls");
  });

  it("normalizes alternate call payload fields and defaults missing values", async () => {
    mockPost.mockResolvedValue({
      data: {
        id: 45,
        bookingId: "99",
        customer: { name: "Riya" },
        customerId: 123,
        status: "ACTIVE",
        createdAt: "2026-07-12T10:00:00Z",
      },
    });

    await expect(createPartnerCall(99)).resolves.toEqual({
      callId: "45",
      orderId: 99,
      customerName: "Riya",
      customerId: "123",
      direction: "outgoing",
      status: "active",
      startedAt: "2026-07-12T10:00:00Z",
    });
  });

  it("falls back to customer defaults when outgoing call fields are incomplete", async () => {
    mockPost.mockResolvedValue({ data: { data: {} } });

    await expect(createPartnerCall(44)).resolves.toEqual({
      callId: "",
      orderId: NaN,
      customerName: "Customer",
      customerId: undefined,
      direction: "outgoing",
      status: "ringing",
      startedAt: undefined,
    });
  });

  it("surfaces readable api errors when creating a call fails", async () => {
    mockPost.mockRejectedValueOnce(new Error("backend unavailable"));

    await expect(createPartnerCall(12)).rejects.toThrow("backend unavailable");
  });

  it("calls accept, reject, end, and missed endpoints", async () => {
    mockPost.mockResolvedValue({});
    await acceptPartnerCall("call/id");
    await rejectPartnerCall("call/id", "BUSY");
    await endPartnerCall("call/id", "HANGUP");
    await markPartnerCallMissed("call/id");
    expect(mockPost.mock.calls).toEqual([
      ["/api/v1/partner/calls/call%2Fid/accept"],
      ["/api/v1/partner/calls/call%2Fid/reject", { reason: "BUSY" }],
      ["/api/v1/partner/calls/call%2Fid/end", { reason: "HANGUP" }],
      ["/api/v1/partner/calls/call%2Fid/missed"],
    ]);
  });

  it("uses default reasons when rejecting or ending a call without an explicit reason", async () => {
    mockPost.mockResolvedValue({});

    await rejectPartnerCall("call id");
    await endPartnerCall("call id");

    expect(mockPost.mock.calls).toEqual([
      ["/api/v1/partner/calls/call%20id/reject", { reason: "DECLINED" }],
      ["/api/v1/partner/calls/call%20id/end", { reason: "HANGUP" }],
    ]);
  });

  it("parses and consumes background incoming-call payloads once", async () => {
    const call = parseCallPush({ data: { notificationType: "INCOMING_CALL", callId: "c2", bookingId: "7", callerName: "Riya" } });
    expect(call).toMatchObject({ type: "INCOMING_CALL", callId: "c2", orderId: 7, customerName: "Riya" });
    await savePendingIncomingCall(call!);
    await expect(consumePendingIncomingCall()).resolves.toEqual(call);
    await expect(consumePendingIncomingCall()).resolves.toBeNull();
  });

  it("returns null and still clears storage when pending call payload is invalid json", async () => {
    await AsyncStorage.setItem("partner_pending_incoming_call", "{bad-json");

    await expect(consumePendingIncomingCall()).resolves.toBeNull();
    await expect(AsyncStorage.getItem("partner_pending_incoming_call")).resolves.toBeNull();
  });

  it("parses supported push shapes and normalizes optional fields", () => {
    expect(
      parseCallPush({
        type: "call_missed",
        id: " call-1 ",
        orderId: "42",
        customerName: "Asha",
        customerId: 88,
        expiresAt: 123456,
      }),
    ).toEqual({
      type: "CALL_MISSED",
      callId: "call-1",
      orderId: 42,
      customerName: "Asha",
      customerId: "88",
      expiresAt: "123456",
    });

    expect(
      parseCallPush({
        data: {
          redirectType: "call_cancelled",
          callId: "call-2",
          bookingId: 7,
        },
      }),
    ).toEqual({
      type: "CALL_CANCELLED",
      callId: "call-2",
      orderId: 7,
      customerName: "Customer",
      customerId: undefined,
      expiresAt: undefined,
    });
  });

  it("ignores malformed or unrelated pushes", () => {
    expect(parseCallPush({ data: { type: "CHAT", callId: "c" } })).toBeNull();
    expect(parseCallPush({ data: { type: "INCOMING_CALL", callId: "", orderId: 0 } })).toBeNull();
    expect(parseCallPush({ data: { type: "INCOMING_CALL", callId: "   ", orderId: 5 } })).toBeNull();
    expect(parseCallPush({ data: { type: "CALL_MISSED", callId: "c3", orderId: "oops" } })).toBeNull();
  });
});
