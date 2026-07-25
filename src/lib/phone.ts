// Uzbek phone helpers. The canonical stored form is E.164 ("+998931101101");
// UI shows/edits the human mask "+998-(93)-110-11-01".

/**
 * Progressive mask for an Uzbek mobile number. Accepts any partial or complete
 * input and formats what it can, always keeping the fixed "+998" prefix — so a
 * field defaulted to "+998" can never be deleted below it. Never ends in a
 * separator, which keeps backspace behaving naturally.
 */
export function formatUzPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const national = (digits.startsWith("998") ? digits.slice(3) : "").slice(0, 9);
  let out = "+998";
  if (national.length >= 1) out += `-(${national.slice(0, 2)}`;
  if (national.length >= 3) out += `)-${national.slice(2, 5)}`;
  if (national.length >= 6) out += `-${national.slice(5, 7)}`;
  if (national.length >= 8) out += `-${national.slice(7, 9)}`;
  return out;
}

/** Any masked/raw input → "+998931101101"; "" when there is no national part. */
export function phoneToE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  const national = digits.startsWith("998") ? digits.slice(3, 12) : "";
  return national ? `+998${national}` : "";
}

/** True once the national part is a full 9 digits. */
export function isUzPhoneComplete(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.startsWith("998") && digits.slice(3).length >= 9;
}
