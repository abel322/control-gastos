import { Wallet, TrendingDown, Receipt, TrendingUp } from "lucide-react";
import { formatVES, formatUSD } from "@/lib/format";

interface SummaryCardsProps {
  balanceVES: number;
  balanceUSD: number;
  totalSpentVES: number;
  totalSpentUSD: number;
  transactionCount: number;
}

export default function SummaryCards({
  balanceVES,
  balanceUSD,
  totalSpentVES,
  totalSpentUSD,
  transactionCount,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* Saldo del Mes */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Saldo del Mes
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              Bs. {formatVES(balanceVES)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              ≈ $ {formatUSD(balanceUSD)}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary to-purple-400" />
      </div>

      {/* Total Gastado */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Gastado
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              Bs. {formatVES(totalSpentVES)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              ≈ $ {formatUSD(totalSpentUSD)}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <TrendingDown className="h-6 w-6 text-red-500" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-300" />
      </div>

      {/* Gastos del Mes */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Gastos del Mes
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {transactionCount}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              transacciones registradas
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Receipt className="h-6 w-6 text-emerald-500" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
      </div>
    </div>
  );
}
