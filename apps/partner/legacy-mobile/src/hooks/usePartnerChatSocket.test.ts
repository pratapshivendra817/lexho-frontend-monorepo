import React from "react";
import { act } from "@testing-library/react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockDispatch = jest.fn();
const mockRemoveConnectionListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockChatSocketConnect = jest.fn();
const mockChatSocketDisconnect = jest.fn();
const mockAddConnectionListener = jest.fn();
const mockAddListener = jest.fn();
const mockSetChatConnected = jest.fn((payload) => ({ type: "chat/setConnected", payload }));
const mockReceiveMessage = jest.fn((payload) => ({ type: "chat/receiveMessage", payload }));
const mockSetCustomerTyping = jest.fn((payload) => ({ type: "chat/setCustomerTyping", payload }));
const mockApplyReceipt = jest.fn((payload) => ({ type: "chat/applyReceipt", payload }));
let consoleErrorSpy: jest.SpyInstance;

jest.mock("./useRedux", () => ({
  useAppDispatch: jest.fn(() => mockDispatch),
}));

jest.mock("../redux/slices/chatSlice", () => ({
  applyReceipt: jest.fn((payload) => mockApplyReceipt(payload)),
  receiveMessage: jest.fn((payload) => mockReceiveMessage(payload)),
  setChatConnected: jest.fn((payload) => mockSetChatConnected(payload)),
  setCustomerTyping: jest.fn((payload) => mockSetCustomerTyping(payload)),
}));

jest.mock("../services/chatSocket", () => ({
  chatSocket: {
    connect: jest.fn(() => mockChatSocketConnect()),
    disconnect: jest.fn(() => mockChatSocketDisconnect()),
    addConnectionListener: jest.fn((listener) => mockAddConnectionListener(listener)),
    addListener: jest.fn((listener) => mockAddListener(listener)),
  },
}));
import { usePartnerChatSocket } from "./usePartnerChatSocket";

describe("usePartnerChatSocket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddConnectionListener.mockImplementation(() => mockRemoveConnectionListener);
    mockAddListener.mockImplementation(() => mockRemoveEventListener);
    mockChatSocketConnect.mockResolvedValue(undefined);
    const passthroughConsoleError = console.error.bind(console);
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args) => {
      const [firstArg] = args;
      const message = typeof firstArg === "string" ? firstArg : "";

      if (message.includes("You called act(async () => ...) without await.")) {
        return;
      }

      passthroughConsoleError(...args);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("disconnects immediately when disabled", () => {
    jest.spyOn(React, "useEffect").mockImplementationOnce((effect: () => void | (() => void)) => {
      effect();
    });

    usePartnerChatSocket(false);

    expect(mockChatSocketDisconnect).toHaveBeenCalledTimes(1);
    expect(mockAddConnectionListener).not.toHaveBeenCalled();
    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it("connects, wires listeners, and cleans up on unmount", async () => {
    let cleanup: (() => void) | void;
    jest.spyOn(React, "useEffect").mockImplementationOnce((effect: () => void | (() => void)) => {
      cleanup = effect();
    });

    usePartnerChatSocket(true);

    expect(mockAddConnectionListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockChatSocketConnect).toHaveBeenCalledTimes(1);

    const eventHandler = mockAddListener.mock.calls[0][0];
    const connectionHandler = mockAddConnectionListener.mock.calls[0][0];
    act(() => {
      connectionHandler(true);
      connectionHandler(false);
    });

    expect(mockSetChatConnected).toHaveBeenCalledWith(true);
    expect(mockSetChatConnected).toHaveBeenCalledWith(false);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "chat/setConnected", payload: true });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "chat/setConnected", payload: false });

    act(() => {
      eventHandler({ type: "MESSAGE", message: { id: "m1" } });
      eventHandler({ type: "TYPING", senderType: "CUSTOMER", orderId: 10, typing: true });
      eventHandler({ type: "TYPING", senderType: "PARTNER", orderId: 10, typing: false });
      eventHandler({ type: "READ", orderId: 11, readAt: "now" });
      eventHandler({ type: "DELIVERED", orderId: 12, messageIds: ["x"] });
      eventHandler({ type: "UNKNOWN" });
    });

    expect(mockReceiveMessage).toHaveBeenCalledWith({ id: "m1" });
    expect(mockSetCustomerTyping).toHaveBeenCalledWith({ orderId: 10, typing: true });
    expect(mockSetCustomerTyping).toHaveBeenCalledTimes(1);
    expect(mockApplyReceipt).toHaveBeenCalledWith({
      orderId: 11,
      messageIds: [],
      status: "read",
      readAt: "now",
    });
    expect(mockApplyReceipt).toHaveBeenCalledWith({
      orderId: 12,
      messageIds: ["x"],
      status: "delivered",
    });

    cleanup?.();
    expect(mockRemoveConnectionListener).toHaveBeenCalledTimes(1);
    expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
    expect(mockChatSocketDisconnect).toHaveBeenCalledTimes(1);
  });

  it("dispatches disconnected state when socket connect fails", () => {
    mockChatSocketConnect.mockReturnValueOnce({
      catch: (handler: (error: Error) => void) => {
        handler(new Error("chat offline"));
        return Promise.resolve(undefined);
      },
    } as Promise<void>);
    jest.spyOn(React, "useEffect").mockImplementationOnce((effect: () => void | (() => void)) => {
      effect();
    });

    usePartnerChatSocket(true);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "chat/setConnected", payload: false });
  });
});
