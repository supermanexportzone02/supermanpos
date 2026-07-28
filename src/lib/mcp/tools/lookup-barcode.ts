import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "lookup_barcode",
  title: "Look up product by barcode",
  description:
    "Look up a single product by a scanned barcode value and return its current stock, price, cost and low-stock status.",
  inputSchema: {
    barcode: z.string().trim().min(1).describe("Scanned barcode value."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ barcode }, ctx) => {
    const unauthorized = requireAuth(ctx);
    if (unauthorized) return unauthorized;

    const { data, error } = await supabaseForUser(ctx)
      .from("products")
      .select("id,name,barcode,category,price,cost,stock,low_stock_threshold")
      .eq("barcode", barcode)
      .limit(1);

    if (error) return errorResult(error.message);

    const product = data?.[0];
    if (!product) return textResult({ found: false, barcode });

    return textResult({
      found: true,
      product: {
        ...product,
        in_stock: product.stock > 0,
        low_stock: product.stock <= product.low_stock_threshold,
        margin: Number(product.price) - Number(product.cost),
      },
    });
  },
});
