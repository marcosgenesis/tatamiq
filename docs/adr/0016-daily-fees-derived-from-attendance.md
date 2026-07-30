# Daily fees derived from attendance

Students have exactly one billing method at a time: monthly fee or daily fee. A daily fee is created from the first valid attendance of a daily-billed student on a calendar day, is shared by any other valid attendances that day, snapshots the academy-wide daily price, and is due that day. This keeps financial records anchored to training rather than requiring a second manual entry.

Billing-method changes take effect immediately but retain an effective-date history, so backdated attendance uses the method that was valid on its date. Conflicting charges and outstanding daily credit must be resolved explicitly during a change or inactivation; the system never silently rewrites financial history. Payments, Pix receipts, credits, and partial balances are shared financial mechanisms for monthly and daily fees. This adds lifecycle complexity compared with one full payment per charge, but preserves correct balances and an auditable operation.
