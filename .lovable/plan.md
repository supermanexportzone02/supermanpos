## Invoice editing for managers

- Limit invoice edits in Reports to Admin, Manager, and Owner accounts.
- Expand the existing Edit action to load and edit invoice date/number, customer, products, quantities, item prices, discount mode/value, and paid amount.
- Save revised invoice lines and totals, reconcile stock and customer purchase/points totals, and refresh the receipt/report data.
- Add a focused permission test and verify the edit flow in the preview.

## Technical details

- Keep the sales tables unchanged; use existing sale and sale-item fields.
- Centralize role eligibility in a small shared helper and test Admin, Manager, Owner, and non-manager access.