export type ExpenseCategory = "ish_haqi" | "ijara" | "materiallar" | "marketing" | "kommunal" | "boshqa";
export type IncomeCategory = "implant" | "plomba" | "tozalash" | "oqartirish" | "toj" | "boshqa_daromad";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  isAutomatic?: boolean;
}

export interface Income {
  id: string;
  date: string;
  category: IncomeCategory;
  description: string;
  amount: number;
  patientName?: string;
  isAutomatic?: boolean;
}

export interface RecurringExpense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  dayOfMonth: number;
  isActive: boolean;
}

export const expenseCategories: ExpenseCategory[] = [
  "ish_haqi", "ijara", "materiallar", "marketing", "kommunal", "boshqa",
];

export const incomeCategories: IncomeCategory[] = [
  "implant", "plomba", "tozalash", "oqartirish", "toj", "boshqa_daromad",
];

export const mockExpenses: Expense[] = [
  { id: "exp-1", date: "2026-04-01", category: "ijara", description: "Klinika ijarasi", amount: 8000000 },
  { id: "exp-2", date: "2026-04-01", category: "ish_haqi", description: "Hamshira ish haqi", amount: 4500000 },
  { id: "exp-3", date: "2026-04-02", category: "materiallar", description: "Kompozit plomba A2 (12 dona)", amount: 960000 },
  { id: "exp-4", date: "2026-04-02", category: "kommunal", description: "Elektr energiya", amount: 850000 },
  { id: "exp-5", date: "2026-04-03", category: "materiallar", description: "Lidokain 2% (25 dona)", amount: 500000 },
  { id: "exp-6", date: "2026-04-03", category: "marketing", description: "Instagram reklama", amount: 1200000 },
  { id: "exp-7", date: "2026-04-04", category: "ish_haqi", description: "Resepsionist ish haqi", amount: 3000000 },
  { id: "exp-8", date: "2026-04-04", category: "boshqa", description: "Ofis tozalash xizmati", amount: 600000 },
  { id: "exp-9", date: "2026-04-05", category: "materiallar", description: "Nitril qo'lqop (22 quti)", amount: 1100000 },
  { id: "exp-10", date: "2026-03-28", category: "kommunal", description: "Suv to'lovi", amount: 320000 },
  { id: "exp-11", date: "2026-03-25", category: "ijara", description: "Klinika ijarasi", amount: 8000000 },
  { id: "exp-12", date: "2026-03-20", category: "ish_haqi", description: "Ish haqi (asosiy)", amount: 12000000 },
];

export const mockIncomes: Income[] = [
  { id: "inc-1", date: "2026-04-01", category: "implant", description: "Implant o'rnatish", amount: 12000000, patientName: "Aziza Karimova", isAutomatic: true },
  { id: "inc-2", date: "2026-04-01", category: "plomba", description: "Kompozit plomba", amount: 800000, patientName: "Bobur Toshmatov", isAutomatic: true },
  { id: "inc-3", date: "2026-04-02", category: "tozalash", description: "Professional tozalash", amount: 500000, patientName: "Dilnoza Rahimova", isAutomatic: true },
  { id: "inc-4", date: "2026-04-02", category: "toj", description: "Sirkoniy toj", amount: 4500000, patientName: "Eldor Sobirov", isAutomatic: true },
  { id: "inc-5", date: "2026-04-03", category: "plomba", description: "Plomba (2 ta tish)", amount: 1600000, patientName: "Feruza Alimova", isAutomatic: true },
  { id: "inc-6", date: "2026-04-03", category: "oqartirish", description: "Tish oqartirish", amount: 3000000, patientName: "Gavhar Yusupova", isAutomatic: true },
  { id: "inc-7", date: "2026-04-04", category: "implant", description: "Implant konsultatsiya + o'rnatish", amount: 15000000, patientName: "Husan Mirzayev", isAutomatic: true },
  { id: "inc-8", date: "2026-04-04", category: "plomba", description: "Plomba almashtirish", amount: 900000, patientName: "Iroda Nazarova", isAutomatic: true },
  { id: "inc-9", date: "2026-04-05", category: "tozalash", description: "Ultratovush tozalash", amount: 600000, patientName: "Jasur Xolmatov", isAutomatic: true },
  { id: "inc-10", date: "2026-04-05", category: "boshqa_daromad", description: "Eski jihoz sotildi", amount: 2000000 },
  { id: "inc-11", date: "2026-04-06", category: "toj", description: "Metall-keramika toj (3 dona)", amount: 9000000, patientName: "Kamola Umarova", isAutomatic: true },
  { id: "inc-12", date: "2026-03-30", category: "implant", description: "Implant o'rnatish", amount: 12000000, patientName: "Laziz Karimov", isAutomatic: true },
  { id: "inc-13", date: "2026-03-28", category: "plomba", description: "Plomba", amount: 800000, patientName: "Madina Ergasheva", isAutomatic: true },
  { id: "inc-14", date: "2026-03-15", category: "oqartirish", description: "Lazer oqartirish", amount: 3500000, patientName: "Nodira Tursunova", isAutomatic: true },
];

export const mockRecurringExpenses: RecurringExpense[] = [
  { id: "rec-1", category: "ijara", description: "Klinika ijarasi", amount: 8000000, dayOfMonth: 5, isActive: true },
  { id: "rec-2", category: "ish_haqi", description: "Hamshira ish haqi", amount: 4500000, dayOfMonth: 1, isActive: true },
  { id: "rec-3", category: "kommunal", description: "Elektr energiya", amount: 850000, dayOfMonth: 10, isActive: true },
  { id: "rec-4", category: "kommunal", description: "Suv to'lovi", amount: 320000, dayOfMonth: 10, isActive: true },
  { id: "rec-5", category: "ish_haqi", description: "Resepsionist ish haqi", amount: 3000000, dayOfMonth: 1, isActive: true },
  { id: "rec-6", category: "boshqa", description: "Soliq to'lovi", amount: 2500000, dayOfMonth: 15, isActive: true },
];
