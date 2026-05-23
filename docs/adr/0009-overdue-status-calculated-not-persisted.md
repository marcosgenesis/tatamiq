# Overdue status calculated, not persisted

Monthly fees store four statuses in the database: `open`, `under_review`, `paid`, and `waived`. The "overdue" status is not persisted — it is derived at query time: a fee is overdue when `status = 'open' AND due_date < today` (using `America/Sao_Paulo` timezone in V0).

The alternative — persisting `overdue` as a fifth status and running a daily cron to flip `open → overdue` after the due date — introduces a failure mode: if the cron misses a run, fees appear current when they are not. Since "overdue" is fully derivable from existing data (status + due date + current date), calculating it eliminates that risk and removes a state transition the cron must manage.

The daily cron still exists for fee generation (creating new monthly fees 5 days before the due date for active students), but it does not mutate existing fee statuses. The dashboard catch-up also generates missing fees but never changes statuses.

Trade-off: queries that filter or count overdue fees need `WHERE status = 'open' AND due_date < CURRENT_DATE` instead of `WHERE status = 'overdue'`. This is a minor query complexity cost for a meaningful reliability gain.
