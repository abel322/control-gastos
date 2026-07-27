import { getFixedExpenses, getCategories, getLatestExchangeRate } from "../actions";
import FixedExpensesClient from "@/components/dashboard/FixedExpensesClient";

export default async function BudgetsPage() {
  const [fixedExpenses, categories, exchangeRate] = await Promise.all([
    getFixedExpenses(),
    getCategories(),
    getLatestExchangeRate(),
  ]);

  return (
    <FixedExpensesClient
      initialExpenses={fixedExpenses as any}
      categories={categories}
      exchangeRate={exchangeRate}
    />
  );
}
