jest.mock("socket.io-client", () => {
  const socket = { connected: false, on: jest.fn(), off: jest.fn(), once: jest.fn((event: string, callback: (...args: any[]) => void) => { if (event === "connect") callback(); }), emit: jest.fn(), disconnect: jest.fn() };
  return { io: jest.fn(() => socket), __socket: socket };
});
jest.mock("../src/utils/storage", () => ({ getToken: jest.fn(async () => "jwt") }));
jest.mock("../src/constants/env", () => ({ API_BASE_URL: "https://api.example.com" }));

import { socketCallService } from "../src/modules/calling/services/SocketCallService";
const socketModule = require("socket.io-client");
const mockIo = socketModule.io as jest.Mock;
const mockSocket = socketModule.__socket as { connected: boolean; on: jest.Mock; off: jest.Mock; once: jest.Mock; emit: jest.Mock; disconnect: jest.Mock };

describe("SocketCallService", () => {
  afterEach(() => socketCallService.disconnect());
  it("connects with authenticated websocket transport and emits typed events", async () => {
    await socketCallService.connect();
    expect(mockIo).toHaveBeenCalledWith("https://api.example.com", expect.objectContaining({ transports: ["websocket"], auth: { token: "jwt", role: "CUSTOMER" }, reconnection: true }));
    mockSocket.connected = true;
    socketCallService.emit("call:end", { callId: "c1", reason: "HANGUP" });
    expect(mockSocket.emit).toHaveBeenCalledWith("call:end", { callId: "c1", reason: "HANGUP" });
  });
  it("registers and removes call listeners", () => {
    (socketCallService as any).socket = mockSocket;
    const listener = jest.fn();
    const remove = socketCallService.on("call:incoming", listener);
    remove();
    expect(mockSocket.off).toHaveBeenCalledWith("call:incoming", listener);
  });
});
