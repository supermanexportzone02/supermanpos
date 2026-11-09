import assert from "node:assert/strict";
import test from "node:test";

import { canEditInvoices } from "../src/lib/invoice-permissions";

test("Admin, Manager, and Owner can edit invoices", () => {
  assert.equal(canEditInvoices("admin"), true);
  assert.equal(canEditInvoices("Manager"), true);
  assert.equal(canEditInvoices("OWNER"), true);
});

test("cashier and unknown roles cannot edit invoices", () => {
  assert.equal(canEditInvoices("cashier"), false);
  assert.equal(canEditInvoices("salesman"), false);
  assert.equal(canEditInvoices(""), false);
});