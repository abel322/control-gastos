"use client";

import React, { useState } from "react";
import { formatUSD, formatVES } from "@/lib/format";
import {
  Plus,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  PiggyBank,
  Check,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import FixedExpenseModal from "./FixedExpenseModal";
import {
  createFixedExpense,
  togglePaidStatus,
  deleteFixedExpense,
} from "@/app/(dashboard)/actions";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface FixedExpenseItem {
  id: string;
  description: string;
  amount: number;
  currency: string; // "USD" | "VES"
  frequency: string; // "WEEKLY" | "MONTHLY"
  isPaid: boolean;
  categoryId: string;
  category: Category;
  createdAt: Date | string;
}

interface FixedExpensesClientProps {
  initialExpenses: FixedExpenseItem[];
  categories: Category[];
  exchangeRate: number;
}

export default function FixedExpensesClient({
  initialExpenses,
  categories,
  exchangeRate,
}: FixedExpensesClientProps) {
  const [expenses, setExpenses] = useState<FixedExpenseItem[]>(initialExpenses);
  const [activeTab, setActiveTab] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Helper to convert item amount to USD and VES
  const getItemUSD = (item: FixedExpenseItem) =>
    item.currency === "USD" ? item.amount : item.amount / exchangeRate;
  const getItemVES = (item: FixedExpenseItem) =>
    item.currency === "VES" ? item.amount : item.amount * exchangeRate;

  // Compute metrics
  const weeklyItems = expenses.filter((e) => e.frequency === "WEEKLY");
  const monthlyItems = expenses.filter((e) => e.frequency === "MONTHLY");

  const weeklyUSD = weeklyItems.reduce((acc, item) => acc + getItemUSD(item), 0);
  const weeklyVES = weeklyItems.reduce((acc, item) => acc + getItemVES(item), 0);

  const monthlyUSD = monthlyItems.reduce((acc, item) => acc + getItemUSD(item), 0);
  const monthlyVES = monthlyItems.reduce((acc, item) => acc + getItemVES(item), 0);

  const totalProjectedUSD = monthlyUSD + weeklyUSD * 4;
  const totalProjectedVES = monthlyVES + weeklyVES * 4;

  const activeItems = activeTab === "WEEKLY" ? weeklyItems : monthlyItems;
  const paidCount = activeItems.filter((i) => i.isPaid).length;

  // Handlers
  const handleCreate = async (data: {
    description: string;
    amount: number;
    currency: "USD" | "VES";
    frequency: "WEEKLY" | "MONTHLY";
    categoryId: string;
  }) => {
    const res = await createFixedExpense(data);
    if (res.success && res.fixedExpense) {
      const newCat =
        categories.find((c) => c.id === data.categoryId) || {
          id: data.categoryId,
          name: "General",
          color: "#8b5cf6",
          icon: "📦",
        };

      const newItem: FixedExpenseItem = {
        id: res.fixedExpense.id,
        description: res.fixedExpense.description,
        amount: res.fixedExpense.amount,
        currency: res.fixedExpense.currency,
        frequency: res.fixedExpense.frequency,
        isPaid: res.fixedExpense.isPaid,
        categoryId: res.fixedExpense.categoryId,
        category: (res.fixedExpense as any).category || newCat,
        createdAt: res.fixedExpense.createdAt || new Date(),
      };

      setExpenses((prev) => [newItem, ...prev]);
    }
  };

  const handleTogglePaid = async (id: string, currentPaid: boolean) => {
    setIsUpdating(id);
    const newPaidState = !currentPaid;

    // Optimistic UI update
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isPaid: newPaidState } : e))
    );

    try {
      await togglePaidStatus(id, newPaidState);
    } catch {
      // Revert if error
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isPaid: currentPaid } : e))
      );
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    setIsUpdating(id);
    // Optimistic UI delete
    const previous = [...expenses];
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    try {
      await deleteFixedExpense(id);
    } catch {
      setExpenses(previous);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Gastos Fijos y Compromisos</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Recurrentes
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Administra tus pagos obligatorios semanales y mensuales de forma clara y organízalos por estado.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Configurar Gasto Fijo</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Weekly commitments */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Compromisos Semanales
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-black text-gray-900">
              {formatUSD(weeklyUSD)}
            </div>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              ≈ {formatVES(weeklyVES)} / semana
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-lg w-fit font-medium">
            <span>{weeklyItems.length} gastos fijos semanales</span>
          </div>
        </div>

        {/* Monthly commitments */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Compromisos Mensuales
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-black text-gray-900">
              {formatUSD(monthlyUSD)}
            </div>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              ≈ {formatVES(monthlyVES)} / mes
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50/80 px-3 py-1.5 rounded-lg w-fit font-medium">
            <span>{monthlyItems.length} servicios y pagos mensuales</span>
          </div>
        </div>

        {/* Total Projected Month */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-white p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
              Total Obligatorio del Mes
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-black text-primary">
              {formatUSD(totalProjectedUSD)}
            </div>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              Proyectado: {formatVES(totalProjectedVES)}
            </p>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Suma de compromisos mensuales + (semanales × 4).
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Tabs & Controls Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 p-4 sm:p-6 bg-gray-50/50">
          {/* Tabs */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => setActiveTab("WEEKLY")}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                activeTab === "WEEKLY"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Semanales ({weeklyItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("MONTHLY")}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                activeTab === "MONTHLY"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span>Mensuales ({monthlyItems.length})</span>
            </button>
          </div>

          {/* Progress Summary for active tab */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-gray-500 font-medium">Cubierto: </span>
              <span className="text-xs font-bold text-gray-900">
                {paidCount} de {activeItems.length}
              </span>
            </div>
            {activeItems.length > 0 && (
              <div className="h-2 w-24 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${(paidCount / activeItems.length) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* List of Commitments */}
        {activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
              <PiggyBank className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              No hay compromisos {activeTab === "WEEKLY" ? "semanales" : "mensuales"}
            </h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              Empieza agregando un nuevo gasto fijo como mercado, internet o servicios obligatorios.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Compromiso</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeItems.map((item) => {
              const isPaid = item.isPaid;
              return (
                <div
                  key={item.id}
                  className={clsx(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 transition-all duration-300",
                    isPaid
                      ? "bg-gray-50/80 opacity-60"
                      : "bg-white hover:bg-gray-50/50"
                  )}
                >
                  {/* Left: Checkbox + Description & Category */}
                  <div className="flex items-center gap-4">
                    {/* Switch/Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleTogglePaid(item.id, isPaid)}
                      disabled={isUpdating === item.id}
                      className={clsx(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                        isPaid
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                          : "border-gray-300 bg-white hover:border-emerald-400 text-transparent"
                      )}
                      title={isPaid ? "Marcar como pendiente" : "Marcar como pagado"}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </button>

                    {/* Category Icon */}
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-base shadow-xs"
                      style={{
                        backgroundColor: item.category?.color || "#8b5cf6",
                      }}
                    >
                      {item.category?.icon || "📦"}
                    </div>

                    {/* Text Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={clsx(
                            "text-sm font-bold text-gray-900 transition-all",
                            isPaid && "line-through text-gray-500"
                          )}
                        >
                          {item.description}
                        </h4>
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Pagado
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              Pendiente
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Categoría: <span className="font-medium text-gray-700">{item.category?.name || "General"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount & Delete Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <div
                        className={clsx(
                          "text-base font-extrabold text-gray-900",
                          isPaid && "line-through text-gray-400"
                        )}
                      >
                        {item.currency === "USD"
                          ? formatUSD(item.amount)
                          : formatVES(item.amount)}
                      </div>
                      <p className="text-xs text-gray-400 font-medium">
                        {item.currency === "USD"
                          ? `≈ ${formatVES(item.amount * exchangeRate)}`
                          : `≈ ${formatUSD(item.amount / exchangeRate)}`}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isUpdating === item.id}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Eliminar compromiso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <FixedExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        onSubmit={handleCreate}
      />
    </div>
  );
}
