type RecurringCancellationLike = {
  id: string;
  classGroupScheduleId: string;
  occurrenceDate: string;
  revertedAt: Date | null;
};

export function findActiveRecurringCancellation<T extends RecurringCancellationLike>(
  cancellations: T[],
  scheduleId: string,
  occurrenceDate: string,
): T | undefined {
  return cancellations.find(
    (cancellation) =>
      cancellation.classGroupScheduleId === scheduleId &&
      cancellation.occurrenceDate === occurrenceDate &&
      cancellation.revertedAt === null,
  );
}
