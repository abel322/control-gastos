import { getExpenses, getCategories, getLatestExchangeRate, getTotalIncomeUSD } from "../actions";
import ExpensesClient from "@/components/dashboard/ExpensesClient";

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const [expenses, categories, exchangeRate, totalIncomeUSD] = await Promise.all([
    getExpenses(),
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
