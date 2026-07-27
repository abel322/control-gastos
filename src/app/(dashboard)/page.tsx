import SummaryCards from "@/components/dashboard/SummaryCards";
import ExpenseChart from "@/components/dashboard/ExpenseChart";
import PendingRemindersCard from "@/components/dashboard/PendingRemindersCard";
import { getMonthSummary, getPendingFixedExpenses, getLatestExchangeRate } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, pendingItems, exchangeRate] = await Promise.all([
    getMonthSummary(),
    getPendingFixedExpenses(),
    getLatestExchangeRate(),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bienvenido a tu control de gastos bimonetario
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        balanceVES={summary.balanceVES}
        balanceUSD={summary.balanceUSD}
        totalSpentVES={summary.totalSpentVES}
        totalSpentUSD={summary.totalSpentUSD}
        transactionCount={summary.transactionCount}
        totalIncomeVES={summary.totalIncomeVES}
        totalIncomeUSD={summary.totalIncomeUSD}
      />

      {/* Pending Payment Reminders Banner */}
      <PendingRemindersCard
        pendingItems={pendingItems as any}
        exchangeRate={exchangeRate}
      />

      {/* Expense Chart */}
      <ExpenseChart />
    </div>
  );
}
