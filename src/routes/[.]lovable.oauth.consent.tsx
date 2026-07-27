import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type OAuthResult = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string; client_id?: string; redirect_uri?: string } | null;
  scope?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id:
      typeof search.authorization_id === "string" ? search.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { next: location.pathname + location.searchStr },
      });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <Shell>
      <h1 style={{ fontSize: 18, margin: 0 }}>Could not load this request</h1>
      <p style={{ color: "#8ea1bd", fontSize: 13 }}>
        {String((error as Error)?.message ?? error)}
      </p>
    </Shell>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: decideError } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (decideError) {
      setBusy(false);
      return setError(decideError.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 19, margin: 0 }}>
        Connect {clientName} to Superman Export Zone
      </h1>
      <p style={{ color: "#8ea1bd", fontSize: 13, marginTop: 8 }}>
        This lets {clientName} use this POS as you — reading inventory, customers and
        sales reports through the app's tools.
      </p>
      {details?.client?.redirect_uri && (
        <p style={{ color: "#61728c", fontSize: 12, wordBreak: "break-all" }}>
          Redirects to: {details.client.redirect_uri}
        </p>
      )}
      <ul style={{ color: "#8ea1bd", fontSize: 13, paddingLeft: 18 }}>
        <li>Share your basic profile and email address</li>
        <li>Read products, low stock, customers, invoices and sales summaries</li>
      </ul>
      <p style={{ color: "#61728c", fontSize: 12 }}>
        This does not bypass this app's permissions or backend policies.
      </p>
      {error && (
        <p role="alert" style={{ color: "#ff8080", fontSize: 12 }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          disabled={busy}
          onClick={() => decide(true)}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: "#2f6bff",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #2a3a55",
            background: "transparent",
            color: "#e6edf7",
            cursor: "pointer",
          }}
        >
          Cancel connection
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
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
          maxWidth: 440,
          background: "#131a26",
          border: "1px solid #223047",
          borderRadius: 14,
          padding: "1.75rem",
        }}
      >
        {children}
      </div>
    </div>
  );
}
