// Thousand-separator mask for money inputs (so'm). The canonical stored form
// is a plain digit string; the UI shows/edits the grouped form "3,400,000".

/** Any input → digit-grouped display, e.g. "3400000" → "3,400,000". */
export function formatThousands(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

/** Grouped display (or any string) → plain digits, ready for Number(). */
export function parseThousands(formatted: string): string {
  return formatted.replace(/\D/g, "");
}
