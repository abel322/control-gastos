import { getIncomes, getLatestExchangeRate } from "../actions";
import IncomesClient from "@/components/dashboard/IncomesClient";

export const dynamic = 'force-dynamic';

export default async function IncomesPage() {
  const [incomes, exchangeRate] = await Promise.all([
    getIncomes(),
    getLatestExchangeRate(),
  ]);

  return (
    <IncomesClient
      initialIncomes={incomes as any}
      exchangeRate={exchangeRate}
    />
  );
}
