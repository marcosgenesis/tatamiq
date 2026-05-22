# Append-only attendance with partial unique index

Attendance records are append-only: invalidating a presence does not delete or update the original row — it marks it with `invalidatedAt`, `invalidatedByUserId`, and a mandatory `invalidationReason`. A new manual presence can then be added as a separate row. A partial unique index on `(classSessionId, studentId) WHERE invalidatedAt IS NULL` ensures at most one valid presence per student per class while allowing the full audit trail to coexist.

The alternative — a single mutable row per student per class — would lose the original source and timestamp when the instructor invalidates a QR presence and replaces it with a manual one. Since the domain explicitly requires invalidated presences to be "preserved in history but excluded from frequency and eligibility," append-only is the natural fit. The partial unique index prevents accidental duplicates without blocking the invalidate-then-re-add flow.
