import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "search_customers",
  title: "Search customers",
  description: "Search POS customers by name or phone number.",
  inputSchema: {
    search: z.string().optional().describe("Match customer name or phone."),
    limit: z.number().int().optional().describe("Max rows to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    const unauthorized = requireAuth(ctx);
    if (unauthorized) return unauthorized;

    let query = supabaseForUser(ctx)
      .from("customers")
      .select("id,name,phone,address,points,total_purchase")
      .order("total_purchase", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));

    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data ?? []);
  },
});
