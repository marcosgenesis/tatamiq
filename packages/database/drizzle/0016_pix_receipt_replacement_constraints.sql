ALTER TABLE "payment_receipts" DROP CONSTRAINT IF EXISTS "payment_receipts_status_check";
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'replaced'));

ALTER TABLE "monthly_fee_events" DROP CONSTRAINT IF EXISTS "monthly_fee_events_type_check";
ALTER TABLE "monthly_fee_events" ADD CONSTRAINT "monthly_fee_events_type_check" CHECK ("type" IN ('waived', 'adjusted', 'receipt_approved', 'receipt_rejected', 'receipt_replaced', 'manual_payment'));
