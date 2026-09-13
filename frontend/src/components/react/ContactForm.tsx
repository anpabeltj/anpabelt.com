import { useEffect, useState } from "react";

type Errors = { name?: string; email?: string; message?: string };
type Toast = { kind: "success" | "error"; text: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: { name: string; email: string; message: string }): Errors {
  const e: Errors = {};
  if (!values.name.trim()) e.name = "Please enter your name.";
  if (!values.email.trim()) e.email = "Email is required.";
  else if (!EMAIL_RE.test(values.email.trim())) e.email = "That doesn't look like a valid email.";
  if (!values.message.trim()) e.message = "Say something first 🙂";
  else if (values.message.trim().length < 10) e.message = "A little more detail? (min 10 characters)";
  return e;
}

export default function ContactForm() {
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    setErrors(validate(values));
  }, [values]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const field = (name: keyof typeof values) => ({
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
  });

  const showErr = (name: keyof Errors) => touched[name] && errors[name];

  const inputCls = (name: keyof Errors) =>
    `w-full rounded-lg bg-elevated border px-4 py-3 text-retro-50 placeholder:text-retro-400 focus:outline-none focus:ring-2 focus:border-transparent transition ${
      showErr(name) ? "border-red-500/60 focus:ring-red-400/60" : "border-white/10 focus:ring-mint/70"
    }`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eMap = validate(values);
    setErrors(eMap);
    setTouched({ name: true, email: true, message: true });
    if (Object.keys(eMap).length > 0) return;

    setSending(true);
    setToast(null);
    try {
      const res = await fetch("/actions/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setValues({ name: "", email: "", message: "" });
      setTouched({});
      setToast({ kind: "success", text: "Thanks! Your message has been sent. 🚀" });
    } catch (err) {
      setToast({ kind: "error", text: err instanceof Error ? err.message : "Failed to send. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="reveal mt-10 rounded-2xl border border-white/5 bg-card p-6 sm:p-8 space-y-5" style={{ animationDelay: "140ms" }} data-testid="contact-form">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white mb-2">Full name</label>
          <input id="name" type="text" placeholder="Your name" data-testid="contact-name-input" className={inputCls("name")} {...field("name")} />
          {showErr("name") && <p className="mt-1.5 text-xs text-red-400" data-testid="contact-name-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">Email</label>
          <input id="email" type="email" placeholder="you@example.com" data-testid="contact-email-input" className={inputCls("email")} {...field("email")} />
          {showErr("email") && <p className="mt-1.5 text-xs text-red-400" data-testid="contact-email-error">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-white mb-2">Message</label>
          <textarea id="message" rows={5} placeholder="What's on your mind?" data-testid="contact-message-input" className={`${inputCls("message")} resize-y`} {...(field("message") as any)} />
          {showErr("message") && <p className="mt-1.5 text-xs text-red-400" data-testid="contact-message-error">{errors.message}</p>}
        </div>

        <button type="submit" disabled={sending} data-testid="contact-submit-button" className="w-full rounded-lg bg-mint hover:bg-mint-bright text-canvas font-semibold py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          {sending ? "Sending…" : "Send Message"}
        </button>
      </form>

      {toast && (
        <div
          role="status"
          data-testid="contact-status"
          className={`fixed bottom-6 right-6 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md transition ${
            toast.kind === "success" ? "border-mint/40 bg-mint/15 text-mint" : "border-red-500/40 bg-red-500/15 text-red-200"
          }`}
          style={{ animation: "cardIn 0.35s ease both" }}
        >
          {toast.text}
        </div>
      )}
    </>
  );
}
