export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function unmaskPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number.parseInt(digits, 10);
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function unmaskCurrency(value: string): string {
  return value.replace(/[^\d,]/g, "");
}
