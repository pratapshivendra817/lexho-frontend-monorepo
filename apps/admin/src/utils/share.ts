import toast from "react-hot-toast";

type SharePayload = {
  title: string;
  text: string;
  url?: string;
  successMessage?: string;
};

function fallbackCopy(content: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(content);
  }

  const textArea = document.createElement("textarea");
  textArea.value = content;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
  return Promise.resolve();
}

export async function shareContent({ title, text, url, successMessage = "Copied to clipboard" }: SharePayload) {
  const combined = [title, text, url].filter(Boolean).join("\n");
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await fallbackCopy(combined);
    toast.success(successMessage);
  } catch (error) {
    const aborted =
      error instanceof DOMException && (error.name === "AbortError" || error.name === "NotAllowedError");
    if (!aborted) toast.error("Unable to share right now");
  }
}
