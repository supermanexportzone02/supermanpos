import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    next: safeNext(search.next),
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ href: search.next });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Superman Export Zone POS" },
      {
        name: "description",
        content:
          "Sign in to your Superman Export Zone POS account to authorize connected apps and AI assistants.",
      },
      { property: "og:title", content: "Sign in — Superman Export Zone POS" },
      {
        property: "og:description",
        content: "Sign in to your Superman Export Zone POS account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") window.location.href = next;
    });
    return () => data.subscription.unsubscribe();
  }, [next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${next}` },
      });
      setBusy(false);
      if (signUpError) return setError(signUpError.message);
      setNotice("Check your email to confirm the account, then sign in.");
      setMode("signin");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) return setError(signInError.message);
    window.location.href = next;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b0f17",
        color: "#e6edf7",
        fontFamily: "system-ui, sans-serif",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#131a26",
          border: "1px solid #223047",
          borderRadius: 14,
          padding: "1.75rem",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Superman Export Zone
        </h1>
        <p style={{ color: "#8ea1bd", fontSize: 13, marginTop: 6 }}>
          {mode === "signin"
            ? "Sign in to your account to continue."
            : "Create an account to continue."}
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 18 }}>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {error && (
            <p role="alert" style={{ color: "#ff8080", fontSize: 12, margin: 0 }}>
              {error}
            </p>
          )}
          {notice && <p style={{ color: "#7ee0a2", fontSize: 12, margin: 0 }}>{notice}</p>}
          <button type="submit" disabled={busy} style={primaryButton}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          style={linkButton}
        >
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>

        <button type="button" onClick={() => navigate({ to: "/" })} style={linkButton}>
          Back to POS
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2a3a55",
  background: "#0e1522",
  color: "#e6edf7",
  fontSize: 14,
};

const primaryButton: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "#2f6bff",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const linkButton: React.CSSProperties = {
  marginTop: 12,
  width: "100%",
  background: "none",
  border: "none",
  color: "#8ea1bd",
  fontSize: 12,
  cursor: "pointer",
};
