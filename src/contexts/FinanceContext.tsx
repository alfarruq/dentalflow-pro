import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  mockExpenses, mockIncomes, mockRecurringExpenses,
  type Expense, type Income, type RecurringExpense,
} from "@/data/mockFinance";

interface FinanceContextValue {
  incomes: Income[];
  expenses: Expense[];
  recurring: RecurringExpense[];
  addIncome: (data: Omit<Income, "id">) => Income;
  updateIncome: (id: string, data: Partial<Omit<Income, "id">>) => void;
  deleteIncome: (id: string) => void;
  addExpense: (data: Omit<Expense, "id">) => Expense;
  updateExpense: (id: string, data: Partial<Omit<Expense, "id">>) => void;
  deleteExpense: (id: string) => void;
  addRecurring: (data: Omit<RecurringExpense, "id">) => RecurringExpense;
  updateRecurring: (id: string, data: Partial<Omit<RecurringExpense, "id">>) => void;
  deleteRecurring: (id: string) => void;
  toggleRecurringActive: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

const KEY_INCOMES   = "finance_incomes";
const KEY_EXPENSES  = "finance_expenses";
const KEY_RECURRING = "finance_recurring";

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T[]) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [incomes,   setIncomes]   = useState<Income[]>(() => load(KEY_INCOMES,   mockIncomes));
  const [expenses,  setExpenses]  = useState<Expense[]>(() => load(KEY_EXPENSES,  mockExpenses));
  const [recurring, setRecurring] = useState<RecurringExpense[]>(() => load(KEY_RECURRING, mockRecurringExpenses));

  useEffect(() => { save(KEY_INCOMES,   incomes);   }, [incomes]);
  useEffect(() => { save(KEY_EXPENSES,  expenses);  }, [expenses]);
  useEffect(() => { save(KEY_RECURRING, recurring); }, [recurring]);

  const addIncome = useCallback((data: Omit<Income, "id">): Income => {
    const entry: Income = { id: `inc-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...data };
    setIncomes((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateIncome = useCallback((id: string, data: Partial<Omit<Income, "id">>) => {
    setIncomes((prev) => prev.map((i) => i.id === id ? { ...i, ...data } : i));
  }, []);

  const deleteIncome = useCallback((id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const addExpense = useCallback((data: Omit<Expense, "id">): Expense => {
    const entry: Expense = { id: `exp-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...data };
    setExpenses((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateExpense = useCallback((id: string, data: Partial<Omit<Expense, "id">>) => {
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, ...data } : e));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addRecurring = useCallback((data: Omit<RecurringExpense, "id">): RecurringExpense => {
    const entry: RecurringExpense = { id: `rec-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...data };
    setRecurring((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateRecurring = useCallback((id: string, data: Partial<Omit<RecurringExpense, "id">>) => {
    setRecurring((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
  }, []);

  const deleteRecurring = useCallback((id: string) => {
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleRecurringActive = useCallback((id: string) => {
    setRecurring((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r));
  }, []);

  return (
    <FinanceContext.Provider value={{
      incomes, expenses, recurring,
      addIncome, updateIncome, deleteIncome,
      addExpense, updateExpense, deleteExpense,
      addRecurring, updateRecurring, deleteRecurring,
      toggleRecurringActive,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
