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
    `w-full rounded-none bg-transparent border-b px-0 py-3 text-retro-50 placeholder:text-retro-400/60 focus:outline-none focus:border-white transition ${
      showErr(name) ? "border-red-500/60" : "border-white/15 hover:border-white/30"
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
      <form onSubmit={onSubmit} noValidate className="reveal mt-12 max-w-2xl border-b border-white/10 pb-14 space-y-10" style={{ animationDelay: "140ms" }} data-testid="contact-form">
        <div>
          <label htmlFor="name" className="mlabel block mb-3"><span className="text-white">01</span> / Full name</label>
          <input id="name" type="text" placeholder="Your name" data-testid="contact-name-input" className={inputCls("name")} {...field("name")} />
          {showErr("name") && <p className="mt-2 text-xs font-mono text-red-400" data-testid="contact-name-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mlabel block mb-3"><span className="text-white">02</span> / Email</label>
          <input id="email" type="email" placeholder="you@example.com" data-testid="contact-email-input" className={inputCls("email")} {...field("email")} />
          {showErr("email") && <p className="mt-2 text-xs font-mono text-red-400" data-testid="contact-email-error">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="message" className="mlabel block mb-3"><span className="text-white">03</span> / Message</label>
          <textarea id="message" rows={5} placeholder="What's on your mind?" data-testid="contact-message-input" className={`${inputCls("message")} resize-y`} {...(field("message") as any)} />
          {showErr("message") && <p className="mt-2 text-xs font-mono text-red-400" data-testid="contact-message-error">{errors.message}</p>}
        </div>

        <button type="submit" disabled={sending} data-testid="contact-submit-button"
          className="w-full sm:w-auto rounded-none border border-white/30 px-10 py-3 text-sm font-mono uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {sending ? "Sending…" : "Send →"}
        </button>
      </form>

      {toast && (
        <div
          role="status"
          data-testid="contact-status"
          className={`fixed bottom-6 right-6 z-[80] max-w-sm rounded-none border px-4 py-3 text-sm shadow-2xl backdrop-blur-md transition ${
            toast.kind === "success" ? "border-white/40 bg-black/90 text-white" : "border-red-500/40 bg-black/90 text-red-200"
          }`}
          style={{ animation: "cardIn 0.35s ease both" }}
        >
          {toast.text}
        </div>
      )}
    </>
  );
}
