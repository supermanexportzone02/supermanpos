import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "List products",
  description:
    "List products in the POS inventory, optionally filtered by a name/barcode search term or category.",
  inputSchema: {
    search: z.string().optional().describe("Match product name or barcode."),
    category: z.string().optional().describe("Filter by category name."),
    limit: z.number().int().optional().describe("Max rows to return (default 50, max 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, category, limit }, ctx) => {
    const unauthorized = requireAuth(ctx);
    if (unauthorized) return unauthorized;

    let query = supabaseForUser(ctx)
      .from("products")
      .select("id,name,barcode,category,price,cost,stock,low_stock_threshold")
      .order("name")
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));

    if (category) query = query.eq("category", category);
    if (search) query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);

    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data ?? []);
  },
});
