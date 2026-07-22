// Reference data for the prescription editor. Frontend-only, like
// mockPrescriptions — the backend has no medication dictionary yet, so this
// list only feeds the searchable picker and its "fill the rest of the row"
// defaults. Doctors can always type a name that is not in the catalog.

export type DoseForm =
  | "tablet" | "capsule" | "sachet" | "gel" | "spray" | "drops" | "injection" | "cream";

export type Frequency =
  | "od" | "bid" | "tid" | "qid" | "q6h" | "q8h" | "q12h" | "prn";

export type DurationUnit = "days" | "weeks";

export type MealRelation = "before" | "after" | "with" | "none";

export type MedicationCategory = "antibiotic" | "analgesic" | "topical" | "other";

export const DOSE_FORMS: DoseForm[] = [
  "tablet", "capsule", "sachet", "gel", "spray", "drops", "injection", "cream",
];

export const FREQUENCIES: Frequency[] = [
  "od", "bid", "tid", "qid", "q6h", "q8h", "q12h", "prn",
];

export const DURATION_UNITS: DurationUnit[] = ["days", "weeks"];

export const MEAL_RELATIONS: MealRelation[] = ["before", "after", "with", "none"];

export const MEDICATION_CATEGORIES: MedicationCategory[] = [
  "antibiotic", "analgesic", "topical", "other",
];

/** The minutes field only makes sense when the dose is offset from a meal. */
export function needsMealOffset(relation: MealRelation): boolean {
  return relation === "before" || relation === "after";
}

// ── Printable sheet wording ─────────────────────────────────────────────────
// The printed prescription reads differently from the editor: "2 mahal/kun"
// becomes "2 mahal" and the meal offset sits inside the phrase
// ("Ovqatdan 30 daq keyin"). Uzbek-only, like the rest of the printed sheet.

const PRINT_FREQUENCY_LABELS: Record<Frequency, string> = {
  od: "1 mahal",
  bid: "2 mahal",
  tid: "3 mahal",
  qid: "4 mahal",
  q6h: "Har 6 soatda",
  q8h: "Har 8 soatda",
  q12h: "Har 12 soatda",
  prn: "Kerak bo'lganda",
};

const PRINT_DOSE_FORM_LABELS: Record<DoseForm, string> = {
  tablet: "tabletka",
  capsule: "kapsula",
  sachet: "sashe",
  gel: "gel",
  spray: "sprey",
  drops: "tomchi",
  injection: "in'yeksiya",
  cream: "krem",
};

const PRINT_DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  days: "kun",
  weeks: "hafta",
};

function printMealPart(relation: MealRelation | undefined, minutes: string | undefined): string {
  const mins = minutes?.trim();
  switch (relation) {
    case "before": return mins ? `Ovqatdan ${mins} daq oldin` : "Ovqatdan oldin";
    case "after": return mins ? `Ovqatdan ${mins} daq keyin` : "Ovqatdan keyin";
    case "with": return "Ovqat bilan";
    default: return "";
  }
}

/**
 * Builds the "Qabul tartibi" cell of the printed sheet. Records written before
 * the structured editor carry no `frequency`, so their saved string is used.
 */
export function formatPrintSchedule(medication: {
  schedule: string;
  frequency?: Frequency;
  mealRelation?: MealRelation;
  mealOffsetMinutes?: string;
}): string {
  if (!medication.frequency) return medication.schedule;
  const freq = PRINT_FREQUENCY_LABELS[medication.frequency];
  const meal = printMealPart(medication.mealRelation, medication.mealOffsetMinutes);
  return meal ? `${freq} · ${meal}` : freq;
}

/** "1 tabletka" — the printed sheet keeps units lowercase inside the sentence. */
export function formatPrintDosage(medication: {
  dosage: string;
  doseAmount?: string;
  doseForm?: DoseForm;
}): string {
  if (!medication.doseForm) return medication.dosage;
  return [medication.doseAmount?.trim(), PRINT_DOSE_FORM_LABELS[medication.doseForm]]
    .filter(Boolean)
    .join(" ");
}

/** "5 kun" / "2 hafta". */
export function formatPrintDuration(medication: {
  duration: string;
  durationAmount?: string;
  durationUnit?: DurationUnit;
}): string {
  const amount = medication.durationAmount?.trim();
  if (!medication.durationUnit || !amount) return medication.duration;
  return `${amount} ${PRINT_DURATION_UNIT_LABELS[medication.durationUnit]}`;
}

export interface CatalogMedicine {
  name: string;
  category: MedicationCategory;
  form: DoseForm;
  /** Defaults applied when the medicine is picked, so most rows need no edits. */
  dose: string;
  frequency: Frequency;
  durationAmount: string;
  durationUnit: DurationUnit;
  mealRelation: MealRelation;
  mealOffsetMinutes?: string;
}

export const MEDICATION_CATALOG: CatalogMedicine[] = [
  // ── Antibiotics ─────────────────────────────────────────────────────────────
  { name: "Amoksiklav 625 mg", category: "antibiotic", form: "tablet", dose: "1", frequency: "bid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Amoksiklav 1000 mg", category: "antibiotic", form: "tablet", dose: "1", frequency: "bid", durationAmount: "7", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Amoksitsillin 500 mg", category: "antibiotic", form: "capsule", dose: "1", frequency: "tid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Azitromitsin 500 mg", category: "antibiotic", form: "tablet", dose: "1", frequency: "od", durationAmount: "3", durationUnit: "days", mealRelation: "before", mealOffsetMinutes: "60" },
  { name: "Tsiprofloksatsin 500 mg", category: "antibiotic", form: "tablet", dose: "1", frequency: "bid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Doksitsiklin 100 mg", category: "antibiotic", form: "capsule", dose: "1", frequency: "bid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Metronidazol 250 mg", category: "antibiotic", form: "tablet", dose: "1", frequency: "tid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Linkomitsin 30% 2 ml", category: "antibiotic", form: "injection", dose: "2", frequency: "bid", durationAmount: "5", durationUnit: "days", mealRelation: "none" },

  // ── Pain / inflammation ─────────────────────────────────────────────────────
  { name: "Nimesil 100 mg", category: "analgesic", form: "sachet", dose: "1", frequency: "bid", durationAmount: "3", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Ibuprofen 400 mg", category: "analgesic", form: "tablet", dose: "1", frequency: "tid", durationAmount: "3", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Ketorol 10 mg", category: "analgesic", form: "tablet", dose: "1", frequency: "prn", durationAmount: "3", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Deksalgin 25 mg", category: "analgesic", form: "tablet", dose: "1", frequency: "tid", durationAmount: "3", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Ketonal 100 mg", category: "analgesic", form: "tablet", dose: "1", frequency: "bid", durationAmount: "3", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Paratsetamol 500 mg", category: "analgesic", form: "tablet", dose: "1", frequency: "tid", durationAmount: "3", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Diklofenak 50 mg", category: "analgesic", form: "tablet", dose: "1", frequency: "bid", durationAmount: "3", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Analgin 500 mg", category: "analgesic", form: "tablet", dose: "1", frequency: "prn", durationAmount: "3", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },

  // ── Topical / rinses ────────────────────────────────────────────────────────
  { name: "Xlorgeksidin 0,05%", category: "topical", form: "drops", dose: "15", frequency: "tid", durationAmount: "7", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Miramistin 0,01%", category: "topical", form: "spray", dose: "1", frequency: "tid", durationAmount: "7", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Xolisal gel", category: "topical", form: "gel", dose: "1", frequency: "tid", durationAmount: "7", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Metrogil Denta gel", category: "topical", form: "gel", dose: "1", frequency: "bid", durationAmount: "7", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Kamistad gel", category: "topical", form: "gel", dose: "1", frequency: "tid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Solkoseril dental pasta", category: "topical", form: "gel", dose: "1", frequency: "tid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Tantum Verde spray", category: "topical", form: "spray", dose: "1", frequency: "qid", durationAmount: "7", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Stomatidin 0,1%", category: "topical", form: "drops", dose: "10", frequency: "bid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Furatsilin eritmasi", category: "topical", form: "drops", dose: "1", frequency: "tid", durationAmount: "5", durationUnit: "days", mealRelation: "none" },
  { name: "Rotokan", category: "topical", form: "drops", dose: "1", frequency: "tid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },

  // ── Supportive ──────────────────────────────────────────────────────────────
  { name: "Suprastin 25 mg", category: "other", form: "tablet", dose: "1", frequency: "bid", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Loratadin 10 mg", category: "other", form: "tablet", dose: "1", frequency: "od", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Setirizin 10 mg", category: "other", form: "tablet", dose: "1", frequency: "od", durationAmount: "5", durationUnit: "days", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Deksametazon 4 mg", category: "other", form: "injection", dose: "1", frequency: "od", durationAmount: "3", durationUnit: "days", mealRelation: "none" },
  { name: "Askorutin", category: "other", form: "tablet", dose: "1", frequency: "tid", durationAmount: "2", durationUnit: "weeks", mealRelation: "after", mealOffsetMinutes: "30" },
  { name: "Kaltsiy D3", category: "other", form: "tablet", dose: "1", frequency: "bid", durationAmount: "4", durationUnit: "weeks", mealRelation: "with" },
];
