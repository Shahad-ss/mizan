export function formatDateOnly(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const dateKey =
    value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
}