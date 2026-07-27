import { defineTool } from "@lovable.dev/mcp-js";

import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "low_stock_products",
  title: "Low stock products",
  description: "List products whose stock is at or below their low-stock threshold.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const unauthorized = requireAuth(ctx);
    if (unauthorized) return unauthorized;

    const { data, error } = await supabaseForUser(ctx)
      .from("products")
      .select("id,name,category,stock,low_stock_threshold,price")
      .order("stock")
      .limit(200);

    if (error) return errorResult(error.message);
    const low = (data ?? []).filter((p) => p.stock <= (p.low_stock_threshold ?? 0));
    return textResult(low);
  },
});
