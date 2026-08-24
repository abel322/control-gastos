"use client";

import React, { useState, useEffect } from "react";
import { formatUSD, formatVES } from "@/lib/format";
import {
  Plus,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  PiggyBank,
  Check,
  Zap,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  TrendingUp,
  Wallet,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import clsx from "clsx";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  addWeeks,
  addMonths,
  subMonths,
  format,
  isSameWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import FixedExpenseModal, { InitialFixedData } from "./FixedExpenseModal";
import CalendarGrid from "./CalendarGrid";
import {
  createFixedExpense,
  createInstallmentExpense,
  updateFixedExpense,
  togglePaidStatusForWeek,
  deleteFixedExpense,
  getFixedExpensesForWeek,
  getFixedExpensesForMonth,
  getWeeklyIncomeData,
  WeeklyIncomeSummary,
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
  type?: string; // "RECURRING" | "ONE_TIME" | "INSTALLMENT"
  isPaid: boolean;
  dueDate?: Date | string | null;
  categoryId: string;
  category?: Category;
  createdAt?: Date | string;
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
  const [monthExpenses, setMonthExpenses] = useState<FixedExpenseItem[]>([]);
  const [incomeData, setIncomeData] = useState<WeeklyIncomeSummary>({
    totalIncomeUSD: 0,
    actualIncomeUSD: 0,
    fallbackIncomeUSD: 0,
    isEstimated: false,
    incomesCount: 0,
  });
  const [viewMode, setViewMode] = useState<"LIST" | "CALENDAR">("LIST");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedExpenseItem | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // 1. Estado de Navegación de Fecha para Semana
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // 2. Estado de Navegación de Fecha para Mes (Calendario)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  const handleResetToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleResetMonth = () => {
    setCurrentMonth(new Date());
  };

  // Cargar datos al cambiar de semana, mes o modo de vista
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        if (viewMode === "CALENDAR") {
          const [mExpenses, incData] = await Promise.all([
            getFixedExpensesForMonth(currentMonth.toISOString()),
            getWeeklyIncomeData(currentWeekStart.toISOString()),
          ]);
          if (isMounted) {
            if (Array.isArray(mExpenses)) {
              setExpenses(mExpenses as any);
              setMonthExpenses(mExpenses as any);
            }
            if (incData) {
              setIncomeData(incData);
            }
          }
        } else {
          const [weekExpenses, incData, mExpenses] = await Promise.all([
            getFixedExpensesForWeek(currentWeekStart.toISOString()),
            getWeeklyIncomeData(currentWeekStart.toISOString()),
            getFixedExpensesForMonth(currentWeekStart.toISOString()),
          ]);
          if (isMounted) {
            if (Array.isArray(weekExpenses)) {
              setExpenses(weekExpenses as any);
            }
            if (Array.isArray(mExpenses)) {
              setMonthExpenses(mExpenses as any);
            }
            if (incData) {
              setIncomeData(incData);
            }
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentWeekStart, currentMonth, viewMode]);

  // Helper to convert item amount to USD and VES
  const getItemUSD = (item: FixedExpenseItem) =>
    item.currency === "USD" ? item.amount : item.amount / exchangeRate;
  const getItemVES = (item: FixedExpenseItem) =>
    item.currency === "VES" ? item.amount : item.amount * exchangeRate;

  // 1. Tarjeta 1 (Semana Activa): Total de Compromisos de la Semana Activa
  const activeWeekUSD = expenses.reduce((acc, item) => acc + getItemUSD(item), 0);
  const activeWeekVES = expenses.reduce((acc, item) => acc + getItemVES(item), 0);

  // 2. Tarjeta 2 (Proyección Mensual): Suma de compromisos mensuales + (semanales x 4)
  const projectionSource = monthExpenses.length > 0 ? monthExpenses : expenses;
  const monthlyItems = projectionSource.filter((e) => e.frequency === "MONTHLY");
  const weeklyItems = projectionSource.filter((e) => e.frequency === "WEEKLY");
  const monthlyUSD = monthlyItems.reduce((acc, item) => acc + getItemUSD(item), 0);
  const monthlyVES = monthlyItems.reduce((acc, item) => acc + getItemVES(item), 0);
  const weeklyUSD = weeklyItems.reduce((acc, item) => acc + getItemUSD(item), 0);
  const weeklyVES = weeklyItems.reduce((acc, item) => acc + getItemVES(item), 0);

  const totalProjectedUSD = monthlyUSD + weeklyUSD * 4;
  const totalProjectedVES = monthlyVES + weeklyVES * 4;

  // 3. Tarjeta 3 (Disponibilidad Semanal): (Ingresos Semanales - Compromisos Semanales)
  const weeklyIncomeUSD = incomeData.weeklyIncomeUSD;
  const weeklyIncomeVES = weeklyIncomeUSD * exchangeRate;
  const weeklyAvailabilityUSD = weeklyIncomeUSD - activeWeekUSD;
  const weeklyAvailabilityVES = weeklyAvailabilityUSD * exchangeRate;
  const isPositiveWeekly = weeklyAvailabilityUSD >= 0;

  // 4. Tarjeta 4 (Disponibilidad Mensual): (Ingresos Proyectados Mensuales - Proyección Obligatoria Mensual)
  const monthlyProjectedIncomeUSD = incomeData.monthlyProjectedIncomeUSD;
  const monthlyProjectedIncomeVES = monthlyProjectedIncomeUSD * exchangeRate;
  const monthlyAvailabilityUSD = monthlyProjectedIncomeUSD - totalProjectedUSD;
  const monthlyAvailabilityVES = monthlyAvailabilityUSD * exchangeRate;
  const isPositiveMonthly = monthlyAvailabilityUSD >= 0;

  const paidCount = expenses.filter((i) => i.isPaid).length;

  // Rango de la semana activa formateado
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = isSameWeek(currentWeekStart, new Date(), {
    weekStartsOn: 1,
  });
  const weekRangeLabel = `${format(currentWeekStart, "dd MMM", {
    locale: es,
  })} - ${format(weekEnd, "dd MMM", { locale: es })}`;

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: FixedExpenseItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: {
    description: string;
    amount: number;
    currency: "USD" | "VES";
    frequency: "WEEKLY" | "MONTHLY";
    type: "RECURRING" | "ONE_TIME" | "INSTALLMENT";
    categoryId: string;
    dueDate?: string;
    startDate?: string;
    installmentFrequency?: "BIWEEKLY" | "MONTHLY";
    totalInstallments?: number;
    recurringDayOfWeek?: string;
    recurringDayOfMonth?: number;
  }) => {
    const matchedCategory = categories.find((c) => c.id === data.categoryId);

    if (data.type === "INSTALLMENT" && data.startDate && data.totalInstallments) {
      // Create Cashea installment schedule
      const res = await createInstallmentExpense({
        description: data.description,
        totalAmount: data.amount,
        currency: data.currency,
        categoryId: data.categoryId,
        startDate: data.startDate,
        installmentFrequency: data.installmentFrequency || "BIWEEKLY",
        totalInstallments: data.totalInstallments,
      });
      if (res.success) {
        const [weekExpenses, mExpenses] = await Promise.all([
          getFixedExpensesForWeek(currentWeekStart.toISOString()),
          getFixedExpensesForMonth(currentWeekStart.toISOString()),
        ]);
        if (Array.isArray(weekExpenses)) setExpenses(weekExpenses as any);
        if (Array.isArray(mExpenses)) setMonthExpenses(mExpenses as any);
      }
      return;
    }

    if (editingItem) {
      // Edit existing fixed expense
      const res = await updateFixedExpense(editingItem.id, data);
      if (res.success) {
        const [wExpenses, mExpenses] = await Promise.all([
          getFixedExpensesForWeek(currentWeekStart.toISOString()),
          getFixedExpensesForMonth(currentWeekStart.toISOString()),
        ]);
        if (Array.isArray(wExpenses)) setExpenses(wExpenses as any);
        if (Array.isArray(mExpenses)) setMonthExpenses(mExpenses as any);
      }
    } else {
      // Create new fixed expense
      const res = await createFixedExpense({
        ...data,
        dueDate: data.dueDate || currentWeekStart.toISOString(),
      });
      if (res.success) {
        const [wExpenses, mExpenses] = await Promise.all([
          getFixedExpensesForWeek(currentWeekStart.toISOString()),
          getFixedExpensesForMonth(currentWeekStart.toISOString()),
        ]);
        if (Array.isArray(wExpenses)) setExpenses(wExpenses as any);
        if (Array.isArray(mExpenses)) setMonthExpenses(mExpenses as any);
      }
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
      await togglePaidStatusForWeek(
        id,
        newPaidState,
        currentWeekStart.toISOString()
      );
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
            <h1 className="text-2xl font-bold text-gray-900">Gastos Fijos y Flujo de Caja</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Control Semanal y Mensual
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Visualiza y administra tus compromisos semanales, mensuales y cuotas en una vista unificada.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Configurar Compromiso / Deuda</span>
        </button>
      </div>

      {/* Metric Cards (Header de Resumen - 4 Tarjetas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Compromisos de la Semana Activa */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Compromisos de la Semana
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-black text-gray-900">
                ${formatUSD(activeWeekUSD)}
              </div>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                ≈ Bs. {formatVES(activeWeekVES)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-lg w-fit font-semibold">
            <span>{expenses.length} compromiso(s) esta semana</span>
          </div>
        </div>

        {/* Card 2: Disponibilidad Semanal (Semana Activa) */}
        <div
          className={clsx(
            "relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between",
            isPositiveWeekly
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-white"
              : "border-red-200 bg-gradient-to-br from-red-50/50 via-white to-white"
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span
                className={clsx(
                  "text-xs font-bold uppercase tracking-wider",
                  isPositiveWeekly ? "text-emerald-900" : "text-red-900"
                )}
              >
                Disponibilidad Semanal
              </span>
              <div
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm",
                  isPositiveWeekly ? "bg-emerald-600" : "bg-red-600"
                )}
              >
                {isPositiveWeekly ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <div
                  className={clsx(
                    "text-2xl font-black",
                    isPositiveWeekly ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {weeklyAvailabilityUSD >= 0 ? "+" : "-"}${formatUSD(Math.abs(weeklyAvailabilityUSD))}
                </div>
                <span
                  className={clsx(
                    "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md",
                    isPositiveWeekly
                      ? "bg-emerald-100/90 text-emerald-800"
                      : "bg-red-100/90 text-red-800"
                  )}
                >
                  {isPositiveWeekly ? "Superávit" : "Déficit"}
                </span>
              </div>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                ≈ Bs. {formatVES(Math.abs(weeklyAvailabilityVES))} (Saldo semanal)
              </p>
            </div>
          </div>

          {/* Desglose claro de Ingresos, Compromisos y Saldo Semanal */}
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span className="text-gray-500">Ingresos semana:</span>
              <span className="font-bold text-gray-900">
                ${formatUSD(weeklyIncomeUSD)}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="text-gray-500">Compromisos:</span>
              <span className="font-bold text-gray-900">
                -${formatUSD(activeWeekUSD)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-200">
              <span className="font-bold text-gray-700">Saldo restante:</span>
              <span
                className={clsx(
                  "font-black text-xs",
                  isPositiveWeekly ? "text-emerald-600" : "text-red-600"
                )}
              >
                {weeklyAvailabilityUSD >= 0 ? "+" : "-"}${formatUSD(Math.abs(weeklyAvailabilityUSD))}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Proyección Obligatoria Mensual */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                Proyección Obligatoria Mensual
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                <Zap className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-black text-primary">
                ${formatUSD(totalProjectedUSD)}
              </div>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                ≈ Bs. {formatVES(totalProjectedVES)} / mes
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500 font-medium">
            Suma de mensuales + (semanales × 4).
          </p>
        </div>

        {/* Card 4: Disponibilidad Mensual (Mes Completo) */}
        <div
          className={clsx(
            "relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between",
            isPositiveMonthly
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-white"
              : "border-red-200 bg-gradient-to-br from-red-50/50 via-white to-white"
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span
                className={clsx(
                  "text-xs font-bold uppercase tracking-wider",
                  isPositiveMonthly ? "text-emerald-900" : "text-red-900"
                )}
              >
                Disponibilidad Mensual
              </span>
              <div
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm",
                  isPositiveMonthly ? "bg-emerald-600" : "bg-red-600"
                )}
              >
                {isPositiveMonthly ? (
                  <PiggyBank className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <div
                  className={clsx(
                    "text-2xl font-black",
                    isPositiveMonthly ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {monthlyAvailabilityUSD >= 0 ? "+" : "-"}${formatUSD(Math.abs(monthlyAvailabilityUSD))}
                </div>
                <span
                  className={clsx(
                    "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md",
                    isPositiveMonthly
                      ? "bg-emerald-100/90 text-emerald-800"
                      : "bg-red-100/90 text-red-800"
                  )}
                >
                  {isPositiveMonthly ? "Superávit" : "Déficit"}
                </span>
              </div>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                ≈ Bs. {formatVES(Math.abs(monthlyAvailabilityVES))} (Saldo mensual)
              </p>
            </div>
          </div>

          {/* Desglose claro de Ingresos Proyectados, Compromisos y Saldo Mensual */}
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span className="text-gray-500">Ingresos proyectados:</span>
              <span className="font-bold text-gray-900">
                ${formatUSD(monthlyProjectedIncomeUSD)}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="text-gray-500">Compromisos mes:</span>
              <span className="font-bold text-gray-900">
                -${formatUSD(totalProjectedUSD)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-200">
              <span className="font-bold text-gray-700">Saldo neto mensual:</span>
              <span
                className={clsx(
                  "font-black text-xs",
                  isPositiveMonthly ? "text-emerald-600" : "text-red-600"
                )}
              >
                {monthlyAvailabilityUSD >= 0 ? "+" : "-"}${formatUSD(Math.abs(monthlyAvailabilityUSD))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle Switch */}
      <div className="flex items-center justify-between gap-4 bg-gray-50/80 p-2 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <button
            onClick={() => setViewMode("LIST")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
              viewMode === "LIST"
                ? "bg-primary text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <Wallet className="h-4 w-4" />
            <span>📋 Lista Semanal</span>
          </button>

          <button
            onClick={() => setViewMode("CALENDAR")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
              viewMode === "CALENDAR"
                ? "bg-primary text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>📅 Calendario Mensual</span>
          </button>
        </div>

        <span className="text-xs text-gray-500 font-medium hidden sm:inline">
          {viewMode === "LIST"
            ? "Mostrando compromisos de la semana seleccionada"
            : "Mostrando cuadrícula del mes completo"}
        </span>
      </div>

      {/* Main Content Area: Calendar or List */}
      {viewMode === "CALENDAR" ? (
        <CalendarGrid
          currentMonth={currentMonth}
          expenses={expenses}
          exchangeRate={exchangeRate}
          categories={categories}
          onTogglePaid={async (id, currentPaid, dateIso) => {
            setIsUpdating(id);
            setExpenses((prev) =>
              prev.map((e) => (e.id === id ? { ...e, isPaid: !currentPaid } : e))
            );
            try {
              await togglePaidStatusForWeek(id, !currentPaid, dateIso);
            } catch {
              setExpenses((prev) =>
                prev.map((e) => (e.id === id ? { ...e, isPaid: currentPaid } : e))
              );
            } finally {
              setIsUpdating(null);
            }
          }}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onResetMonth={handleResetMonth}
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Componente Selector de Semana (UI Header de la Tabla) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-purple-50/40 via-white to-gray-50/40">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold text-gray-900">
                Navegación por Semana
              </span>
            </div>

            {/* Centered Navigation Controls */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
              <button
                onClick={handlePrevWeek}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
                title="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-sm font-extrabold text-gray-900 min-w-[130px] text-center capitalize px-2">
                {weekRangeLabel}
              </span>

              <button
                onClick={handleNextWeek}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
                title="Semana siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {!isCurrentWeek ? (
              <button
                onClick={handleResetToCurrentWeek}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Semana Actual</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
                Semana en curso
              </span>
            )}
          </div>

          {/* Tabla Unificada (Sin Pestañas) Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 p-4 sm:p-6 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Wallet className="h-4 w-4 text-primary" />
              <span>Compromisos de la Semana ({expenses.length})</span>
            </div>

            {/* Progress Summary for active week */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-gray-500 font-medium">Cubierto: </span>
                <span className="text-xs font-bold text-gray-900">
                  {paidCount} de {expenses.length}
                </span>
              </div>
              {expenses.length > 0 && (
                <div className="h-2 w-24 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${(paidCount / expenses.length) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

        {/* List of Commitments */}
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
              <PiggyBank className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              No hay compromisos para esta semana
            </h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              Agrega tus compromisos fijos o financiamientos por cuotas para controlar tu flujo de caja semanal.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Compromiso</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map((item) => {
              const isPaid = item.isPaid;
              const isOneTime = item.type === "ONE_TIME";
              const isInstallment = item.type === "INSTALLMENT" || item.description.includes("Cuota");
              const cat =
                categories.find((c) => c.id === item.categoryId) ||
                item.category;
              const catIcon = cat?.icon || "📦";
              const catColor = cat?.color || "#8b5cf6";
              const catName = cat?.name || "General";

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
                        backgroundColor: catColor,
                      }}
                    >
                      {catIcon}
                    </div>

                    {/* Text Details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={clsx(
                            "text-sm font-bold text-gray-900 transition-all",
                            isPaid && "line-through text-gray-500"
                          )}
                        >
                          {item.description}
                        </h4>

                        {/* Status Badge */}
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

                        {/* Type Badge */}
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                            isInstallment
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : isOneTime
                              ? "bg-purple-50 border-purple-200 text-purple-700"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                          )}
                        >
                          {isInstallment ? "💳 Cuota Cashea" : isOneTime ? "📌 Puntual" : "🔄 Recurrente"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Categoría: <span className="font-medium text-gray-700">{catName}</span>
                        {item.dueDate && (
                          <span className="ml-2 text-purple-600 font-medium">
                            • Vence: {new Date(item.dueDate).toLocaleDateString("es-VE")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount & Actions (Edit + Delete) */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <div
                        className={clsx(
                          "text-base font-extrabold text-gray-900",
                          isPaid && "line-through text-gray-400"
                        )}
                      >
                        {item.currency === "USD"
                          ? `$${formatUSD(item.amount)}`
                          : `Bs. ${formatVES(item.amount)}`}
                      </div>
                      <p className="text-xs text-gray-400 font-medium">
                        {item.currency === "USD"
                          ? `≈ Bs. ${formatVES(item.amount * exchangeRate)}`
                          : `≈ $${formatUSD(item.amount / exchangeRate)}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        disabled={isUpdating === item.id}
                        className="rounded-lg p-2 text-gray-400 hover:bg-purple-50 hover:text-primary transition-colors"
                        title="Editar compromiso"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

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
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Modal */}
      <FixedExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        categories={categories}
        onSubmit={handleModalSubmit}
        defaultDueDate={currentWeekStart}
        initialData={
          editingItem
            ? {
                id: editingItem.id,
                description: editingItem.description,
                amount: editingItem.amount,
                currency: editingItem.currency as "USD" | "VES",
                frequency: editingItem.frequency as "WEEKLY" | "MONTHLY",
                type: (editingItem.type as "RECURRING" | "ONE_TIME" | "INSTALLMENT") || "RECURRING",
                categoryId: editingItem.categoryId,
                dueDate: editingItem.dueDate,
              }
            : null
        }
      />
    </div>
  );
}
