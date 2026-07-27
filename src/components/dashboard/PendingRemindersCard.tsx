"use client";

import Link from "next/link";
import { formatUSD, formatVES } from "@/lib/format";
import { Bell, ArrowRight, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface PendingItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  frequency: string;
  category?: { name: string; icon?: string | null; color?: string | null };
}

interface PendingRemindersCardProps {
  pendingItems: PendingItem[];
  exchangeRate: number;
}

export default function PendingRemindersCard({
  pendingItems,
  exchangeRate,
}: PendingRemindersCardProps) {
  const pendingCount = pendingItems.length;

  const totalPendingUSD = pendingItems.reduce((sum, item) => {
    return sum + (item.currency === "USD" ? item.amount : item.amount / exchangeRate);
  }, 0);

  const totalPendingVES = totalPendingUSD * exchangeRate;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Header Left */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">
                Recordatorios de Pagos Pendientes
              </h3>
              {pendingCount > 0 ? (
                <span className="rounded-full bg-amber-200/70 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
                  {pendingCount} por pagar
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  Al día
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-600">
              {pendingCount > 0
                ? `Tienes ${pendingCount} compromiso(s) obligatorio(s) pendiente(s) por un total de $${formatUSD(totalPendingUSD)} (≈ Bs. ${formatVES(totalPendingVES)}).`
                : "No tienes compromisos fijos pendientes por cubrir esta semana o mes."}
            </p>
          </div>
        </div>

        {/* Header Right Action */}
        <Link
          href="/budgets"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-all shrink-0 active:scale-95"
        >
          <span>Gestionar Pagos</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* List of pending items preview */}
      {pendingCount > 0 && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-amber-200/60 pt-4">
          {pendingItems.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href="/budgets"
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
                  style={{ backgroundColor: item.category?.color || "#8b5cf6" }}
                >
                  {item.category?.icon || "📦"}
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-gray-900 truncate">
                    {item.description}
                  </h4>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {item.category?.name || "General"} • {item.frequency === "WEEKLY" ? "Semanal" : "Mensual"}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-extrabold text-gray-900">
                  {item.currency === "USD" ? `$${formatUSD(item.amount)}` : `Bs. ${formatVES(item.amount)}`}
                </div>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700">
                  <Clock className="h-2.5 w-2.5" />
                  Pendiente
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
