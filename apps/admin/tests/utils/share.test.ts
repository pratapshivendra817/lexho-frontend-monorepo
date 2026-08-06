import { beforeEach, describe, expect, it, vi } from "vitest";

import { shareContent } from "@/utils/share";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: toastMocks,
}));

describe("share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", {});
  });

  it("uses the native share api when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });

    await shareContent({
      title: "Lexho",
      text: "Share this",
      url: "https://example.com",
    });

    expect(share).toHaveBeenCalledWith({
      title: "Lexho",
      text: "Share this",
      url: "https://example.com",
    });
    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("falls back to clipboard writes and shows the default success toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    await shareContent({
      title: "Lexho",
      text: "Share this",
      url: "https://example.com",
    });

    expect(writeText).toHaveBeenCalledWith("Lexho\nShare this\nhttps://example.com");
    expect(toastMocks.success).toHaveBeenCalledWith("Copied to clipboard");
  });

  it("uses the textarea copy fallback and supports custom success messages", async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    const previousExecCommand = document.execCommand;
    document.execCommand = execCommand;

    await shareContent({
      title: "Lexho",
      text: "",
      successMessage: "Copied manually",
    });

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(toastMocks.success).toHaveBeenCalledWith("Copied manually");

    document.execCommand = previousExecCommand;
  });

  it("ignores aborted share failures without showing an error toast", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    vi.stubGlobal("navigator", { share });

    await shareContent({
      title: "Lexho",
      text: "Share this",
    });

    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("also ignores not-allowed share cancellations", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    vi.stubGlobal("navigator", { share });

    await shareContent({
      title: "Lexho",
      text: "Share this",
    });

    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("shows a generic error toast for non-aborted share failures", async () => {
    const share = vi.fn().mockRejectedValue(new Error("unexpected"));
    vi.stubGlobal("navigator", { share });

    await shareContent({
      title: "Lexho",
      text: "Share this",
      url: undefined,
    });

    expect(toastMocks.error).toHaveBeenCalledWith("Unable to share right now");
  });
});
