import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { submitSupportTicket } from "./api";

export function ManageDataPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const sending = useRef(false);

  useEffect(() => {
    document.title = "Manage data | Lexho";
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || status === "sent") return;
    const formElement = event.currentTarget;
    if (!formElement.reportValidity()) return;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();
    if (name.length < 2 || !/^\+?[\d\s()-]+$/.test(phone) || !/^\d{10,15}$/.test(phone.replace(/\D/g, ""))) {
      setError("Enter your full name and a valid registered phone number (10–15 digits).");
      setStatus("error");
      return;
    }

    sending.current = true;
    setStatus("sending");
    try {
      await submitSupportTicket({
        name,
        email,
        phone,
        subject: "Account deletion request",
        message: [
          "I request deletion of my Lexho account and associated personal data.",
          "Submitted through the website Manage data page.",
          "I understand this request requires review and verification of account ownership.",
          reason ? `Reason: ${reason}` : "",
        ].filter(Boolean).join("\n"),
      });
      setStatus("sent");
      formElement.reset();
    } catch {
      setError("We could not send your request. Please try again. Your details have been kept in this form.");
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  return (
    <section className="support manage-data">
      <div className="support-intro">
        <p>Your account & data</p>
        <h1>Manage data</h1>
        <span>Request deletion of your Lexho account and associated personal data using the form below.</span>
        <div className="support-note">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>What happens next?</strong>
            <p>Your request goes to our support team for review and verification of account ownership. Submitting this form does not immediately delete your account.</p>
            <Link to="/privacy">Read our privacy policy <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
      {status === "sent" ? (
        <div className="deletion-success" role="status">
          <ShieldCheck size={32} aria-hidden="true" />
          <h2>Deletion request received</h2>
          <p>Your account deletion request has been sent to our support team. Your account has not been deleted yet.</p>
          <Link className="inline-link" to="/support">Contact support</Link>
        </div>
      ) : (
        <form onSubmit={submit} aria-label="Account deletion request" aria-busy={status === "sending"}>
          <h2>Request account deletion</h2>
          <label>Full name
            <input required name="name" minLength={2} maxLength={100} autoComplete="name" placeholder="Your name" />
          </label>
          <label>Registered phone number
            <input required name="phone" type="tel" autoComplete="tel" maxLength={25} placeholder="Your Lexho account phone number" />
          </label>
          <label>Contact email
            <input required name="email" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" />
          </label>
          <label>Reason <span>(optional)</span>
            <textarea name="reason" rows={4} maxLength={2000} placeholder="Tell us why you want to delete your account" />
          </label>
          <label className="deletion-consent">
            <input required name="confirmation" type="checkbox" />
            <span>I am requesting deletion of my own Lexho account and associated personal data. I understand that account ownership must be verified.</span>
          </label>
          <button type="submit" className="primary" disabled={status === "sending"}>
            {status === "sending" ? "Sending request..." : "Request account deletion"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          {status === "error" ? <p className="error" role="alert">{error}</p> : null}
        </form>
      )}
    </section>
  );
}
