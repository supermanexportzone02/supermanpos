const INVOICE_EDITOR_ROLES = new Set(["admin", "manager", "owner"]);

export function canEditInvoices(role: string): boolean {
  return INVOICE_EDITOR_ROLES.has(role.trim().toLowerCase());
}