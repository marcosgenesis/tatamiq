export function formatAttendanceSummary(present: number, totalInClassGroup: number): string {
  return `${present} ${present === 1 ? "presente" : "presentes"} · ${totalInClassGroup} da turma`;
}
