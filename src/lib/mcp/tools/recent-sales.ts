import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "recent_sales",
  title: "Recent sales",
  description:
    "List recent sales invoices with their line items, newest first. Optionally limited to a date range (ISO dates).",
  inputSchema: {
    from: z.string().optional().describe("Start date, ISO format e.g. 2026-07-01."),
    to: z.string().optional().describe("End date, ISO format e.g. 2026-07-27."),
    limit: z.number().int().optional().describe("Max invoices to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    const unauthorized = requireAuth(ctx);
    if (unauthorized) return unauthorized;

    let query = supabaseForUser(ctx)
      .from("sales")
      .select(
        "id,invoice_no,created_at,subtotal,discount,total,paid,due,customer_id,sale_items(product_name,quantity,price,total)",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", `${to}T23:59:59`);

    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data ?? []);
  },
});
