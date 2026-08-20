import { useEffect, useRef, useState, type FormEvent } from "react";
import { fetchRecipient, parseCertificateParams, LookupError } from "./api";
import { downloadCertificate, renderCertificate } from "./certificate";
import { lookup, seminar } from "./config";
import "./App.css";

type Status = "idle" | "loading" | "ready" | "error";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [autoTried, setAutoTried] = useState(false);

  async function loadRecipient(query: { token?: string; email?: string }) {
    setStatus("loading");
    setMessage("");
    try {
      const recipient = await fetchRecipient(query);
      setName(recipient.name);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof LookupError ? err.message : "Something went wrong. Please try again.");
    }
  }

  useEffect(() => {
    if (autoTried) return;
    setAutoTried(true);
    const { token, email: emailParam } = parseCertificateParams();
    if (emailParam) setEmail(emailParam);
    if (token || emailParam) {
      void loadRecipient({ token, email: emailParam });
    }
  }, [autoTried]);

  useEffect(() => {
    if (status !== "ready" || !name || !canvasRef.current) return;
    void renderCertificate(canvasRef.current, name);
  }, [status, name]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void loadRecipient({ email: email.trim() });
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">{seminar.organization}</p>
        <h1 className="hero-title">{seminar.title}</h1>
        {seminar.tagline && <p className="tagline">{seminar.tagline}</p>}
        <p className="subtitle">{seminar.subtitle}</p>
        <p className="lede">
          After submitting the feedback form, use this page to generate your e-certificate.
          The name printed is taken exactly from the <strong>Full Name</strong> you entered on the form.
        </p>
      </header>


      {status !== "ready" && (
        <form className="card" onSubmit={onSubmit}>
          <label htmlFor="email">Email used on the feedback form</label>
          <div className="row">
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Looking up…
                </>
              ) : (
                "Generate certificate"
              )}
            </button>
          </div>
          {status === "loading" && (
            <p className="loading-status" role="status">
              <span aria-hidden="true">⏳</span> Checking the participant database…
            </p>
          )}
          {lookup.feedbackFormUrl && (
            <p className="hint">
              Have not submitted feedback?{" "}
              <a href={lookup.feedbackFormUrl} target="_blank" rel="noreferrer">
                Open the form
              </a>
            </p>
          )}
          {status === "error" && <p className="error">{message}</p>}
        </form>
      )}

      {status === "ready" && (
        <section className="result">
          <div className="result-bar">
            <p>
              Certificate for <strong>{name}</strong>
            </p>
            <div className="actions">
              <button type="button" onClick={() => canvasRef.current && downloadCertificate(canvasRef.current, name)}>
                Download PNG
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setStatus("idle");
                  setName("");
                }}
              >
                Look up another
              </button>
            </div>
          </div>
          <div className="canvas-wrap">
            <canvas ref={canvasRef} />
          </div>
          <p className="result-note">
            Tip: the certificate is generated at a high resolution — download the PNG and check your
            downloads folder to view or print it at full quality.
          </p>
        </section>
      )}

      <footer className="footer">
        <p className="footer-main">
          {seminar.organization} · {seminar.title} · {seminar.dateLabel}
        </p>
        <p className="footer-sub">
          For questions about your certificate, please contact the organizing committee.
        </p>
        <img className="footer-logo" src="/img/cysdo-combined-logo.png" alt="CYSDO combined logo" />
      </footer>
    </div>
  );
}