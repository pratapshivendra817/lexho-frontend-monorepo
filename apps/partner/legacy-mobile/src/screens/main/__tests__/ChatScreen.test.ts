import { getChatConnectionStatusLabel, getChatMessageStatusLabel } from "../ChatScreen";

describe("ChatScreen helpers", () => {
  const tr = (key: string, fallback: string) =>
    ({
      "chat.is_typing": "is typing...",
      "chat.live": "Live",
      "chat.reconnecting": "Reconnecting...",
      "chat.failed_tap_retry": "Failed - tap to retry",
    }[key] ?? fallback);

  it("builds translated connection status labels", () => {
    expect(getChatConnectionStatusLabel("Aarav", true, true, tr)).toBe("Aarav is typing...");
    expect(getChatConnectionStatusLabel("Aarav", false, true, tr)).toBe("Live");
    expect(getChatConnectionStatusLabel("Aarav", false, false, tr)).toBe("Reconnecting...");
  });

  it("maps message status labels with failed fallback", () => {
    expect(getChatMessageStatusLabel("failed", tr)).toBe("Failed - tap to retry");
    expect(getChatMessageStatusLabel("sent", tr)).toBe("sent");
    expect(getChatMessageStatusLabel(undefined, tr)).toBeNull();
  });
});
