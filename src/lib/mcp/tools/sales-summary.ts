import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "sales_summary",
  title: "Sales summary",
  description:
    "Summarize revenue, discounts, invoice count, expenses and net cash for a date range (defaults to the last 30 days).",
  inputSchema: {
    from: z.string().optional().describe("Start date, ISO format e.g. 2026-07-01."),
    to: z.string().optional().describe("End date, ISO format e.g. 2026-07-27."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    const unauthorized = requireAuth(ctx);
    if (unauthorized) return unauthorized;

    const end = to ?? new Date().toISOString().slice(0, 10);
    const start =
      from ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const supabase = supabaseForUser(ctx);

    const [salesRes, expenseRes] = await Promise.all([
      supabase
        .from("sales")
        .select("total,subtotal,discount,paid,due,created_at")
        .gte("created_at", start)
        .lte("created_at", `${end}T23:59:59`),
      supabase
        .from("expenses")
        .select("amount,category,created_at")
        .gte("created_at", start)
        .lte("created_at", `${end}T23:59:59`),
    ]);

    if (salesRes.error) return errorResult(salesRes.error.message);
    if (expenseRes.error) return errorResult(expenseRes.error.message);

    const sales = salesRes.data ?? [];
    const expenses = expenseRes.data ?? [];
    const sum = (rows: Array<Record<string, unknown>>, key: string) =>
      rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);

    const revenue = sum(sales, "total");
    const totalExpenses = sum(expenses, "amount");

    return textResult({
      range: { from: start, to: end },
      invoices: sales.length,
      revenue,
      subtotal: sum(sales, "subtotal"),
      discount: sum(sales, "discount"),
      paid: sum(sales, "paid"),
      due: sum(sales, "due"),
      expenses: totalExpenses,
      net_cash: revenue - totalExpenses,
      average_invoice: sales.length ? revenue / sales.length : 0,
    });
  },
});
