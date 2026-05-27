# Private payment receipt files

Pix receipts contain personal and financial data, so the V0 stores receipt file keys and serves view/download access through short-lived signed URLs instead of persisting public file URLs. This adds a small backend step when students or instructors open a receipt, but avoids exposing financial documents through long-lived public R2 URLs.
