import assert from "node:assert/strict";
import test from "node:test";

import { canEditInvoices } from "../src/lib/invoice-permissions";

test("Admin can edit invoices", () => {
  assert.equal(canEditInvoices("admin"), true);
});

test("Manager can edit invoices", () => {
  assert.equal(canEditInvoices("Manager"), true);
});

test("Owner can edit invoices", () => {
  assert.equal(canEditInvoices("OWNER"), true);
});

test("cashier cannot edit invoices", () => {
  assert.equal(canEditInvoices("cashier"), false);
});

test("salesman cannot edit invoices", () => {
  assert.equal(canEditInvoices("salesman"), false);
});

test("unknown roles cannot edit invoices", () => {
  assert.equal(canEditInvoices(""), false);
});