import { getExpenses, getCategories, getLatestExchangeRate } from "../actions";
import ExpensesClient from "@/components/dashboard/ExpensesClient";

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const [expenses, categories, exchangeRate] = await Promise.all([
    getExpenses(),
    getCategories(),
    getLatestExchangeRate(),
  ]);

  return (
    <ExpensesClient
      initialExpenses={expenses as any}
      categories={categories}
      exchangeRate={exchangeRate}
    />
  );
}
