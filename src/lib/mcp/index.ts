import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listProducts from "./tools/list-products";
import lowStockProducts from "./tools/low-stock-products";
import searchCustomers from "./tools/search-customers";
import recentSales from "./tools/recent-sales";
import salesSummary from "./tools/sales-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "superman-pos-mcp",
  title: "Superman Export Zone POS",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Superman Export Zone POS. Use `list_products` and `low_stock_products` for inventory, `search_customers` for customer lookup, `recent_sales` for invoices, and `sales_summary` for revenue/expense totals over a date range.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, lowStockProducts, searchCustomers, recentSales, salesSummary],
});
