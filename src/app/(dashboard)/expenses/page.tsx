import { getExpensesForWeek, getCategories, getLatestExchangeRate, getTotalIncomeUSD } from "../actions";
import ExpensesClient from "@/components/dashboard/ExpensesClient";
import { startOfWeek, endOfWeek } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  start.setHours(0, 0, 0, 0);
  const end = endOfWeek(now, { weekStartsOn: 1 });
  end.setHours(23, 59, 59, 999);

  const [expenses, categories, exchangeRate, totalIncomeUSD] = await Promise.all([
    getExpensesForWeek(start.toISOString(), end.toISOString()),
    getCategories(),
    getLatestExchangeRate(),
    getTotalIncomeUSD(),
  ]);

  return (
    <ExpensesClient
      initialExpenses={expenses as any}
      categories={categories}
      exchangeRate={exchangeRate}
      totalIncomeUSD={totalIncomeUSD}
    />
  );
}
