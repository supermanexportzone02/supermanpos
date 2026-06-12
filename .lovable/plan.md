Two small changes to `src/routes/index.tsx` and `src/styles.css`.

## 1. Page refresh dile logout na hoy

Currently `currentUser` lives only in React state, so a refresh wipes it.

- On successful login (`onLogin` in `POSApp`), save the user to `localStorage` under a key like `pos_session` (staff id + colorIdx).
- On boot, after `staffList` loads, read `pos_session`. If the saved staff id still exists in the active staff list, hydrate `currentUser` from that staff record (so role/name/pin reflect the latest DB row) and the user lands straight on the dashboard.
- On logout, remove `pos_session`.
- On PIN change for the current user, refresh the stored entry so it stays consistent.

Note: this only restores who was logged in; PIN verification still runs at login time. (The deeper plaintext-PIN issue is the separate security item from the earlier scan — not touched here.)

## 2. Print e likha gula arekto deep

The thermal invoice (`#invoice-print`) currently prints in light/regular weight. Make it bolder and darker:

- In `src/styles.css` `@media print` block for `#invoice-print`:
  - Bump base `font-size` from 11px to 12px and set `font-weight: 700` on the whole receipt.
  - Force `color: #000` (already set) plus `-webkit-print-color-adjust: exact; print-color-adjust: exact;` so browsers don't lighten it.
  - Increase dashed border thickness from 1px to 1.5px and use solid black for shop name / grand total rows.
- In `showInvoice()` HTML template (`src/routes/index.tsx` ~lines 580–620): bump key labels (Invoice no, Grand Total, Staff/Customer headers) to `font-weight:700` and the shop name to `font-size:16px; font-weight:800;` so the header prints clearly on thermal paper.

No DB or auth-architecture changes. No other features touched.
