export function isMinorDate(birthDate: string, today = new Date()): boolean {
  if (!birthDate) return false;
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return false;
  const birth = new Date(year, month - 1, day);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let age = current.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    current.getMonth() > birth.getMonth() ||
    (current.getMonth() === birth.getMonth() && current.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age -= 1;
  return age < 18;
}
