"use client";

import React, { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { formatUSD, formatVES } from "@/lib/format";
import {
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar as CalendarIcon,
  Check,
} from "lucide-react";
import clsx from "clsx";

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
  currency: string;
  frequency: string;
  type?: string;
  isPaid: boolean;
  dueDate?: Date | string | null;
  categoryId: string;
  category?: Category;
  createdAt?: Date | string;
}

interface CalendarGridProps {
  currentMonth: Date;
  expenses: FixedExpenseItem[];
  exchangeRate: number;
  categories: Category[];
  onTogglePaid: (id: string, currentPaid: boolean, dateIso: string) => Promise<void>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onResetMonth: () => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarGrid({
  currentMonth,
  expenses,
  exchangeRate,
  categories,
  onTogglePaid,
  onPrevMonth,
  onNextMonth,
  onResetMonth,
}: CalendarGridProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isCurrentMonth = isSameMonth(currentMonth, new Date());
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es });

  // Filter items that fall on a specific day
  const getExpensesForDay = (day: Date) => {
    return expenses.filter((expense) => {
      const itemType = expense.type || "RECURRING";

      // 1. ONE_TIME or INSTALLMENT: check exact dueDate or createdAt
      if (itemType === "ONE_TIME" || itemType === "INSTALLMENT") {
        const targetDate = expense.dueDate
          ? new Date(expense.dueDate)
          : expense.createdAt
          ? new Date(expense.createdAt)
          : null;
        if (!targetDate) return false;
        return isSameDay(targetDate, day);
      }

      // 2. RECURRING items
      if (expense.frequency === "WEEKLY") {
        const baseDate = expense.dueDate
          ? new Date(expense.dueDate)
          : expense.createdAt
          ? new Date(expense.createdAt)
          : new Date();
        return day.getDay() === baseDate.getDay();
      }

      if (expense.frequency === "MONTHLY") {
        const baseDate = expense.dueDate
          ? new Date(expense.dueDate)
          : expense.createdAt
          ? new Date(expense.createdAt)
          : new Date();
        return day.getDate() === baseDate.getDate() && isSameMonth(day, currentMonth);
      }

      return false;
    });
  };

  const handleItemToggle = async (
    e: React.MouseEvent,
    item: FixedExpenseItem,
    day: Date
  ) => {
    e.stopPropagation();
    setUpdatingId(item.id);
    try {
      const weekStartIso = startOfWeek(day, { weekStartsOn: 1 }).toISOString();
      await onTogglePaid(item.id, item.isPaid, weekStartIso);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Month Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-purple-50/40 via-white to-gray-50/40 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-gray-900 capitalize">
            Vista Calendario ({monthLabel})
          </span>
        </div>

        {/* Centered Controls */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <button
            onClick={onPrevMonth}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
            title="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm font-extrabold text-gray-900 min-w-[140px] text-center capitalize px-2">
            {monthLabel}
          </span>

          <button
            onClick={onNextMonth}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
            title="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {!isCurrentMonth ? (
          <button
            onClick={onResetMonth}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Mes Actual</span>
          </button>
        ) : (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
            Mes en curso
          </span>
        )}
      </div>

      {/* Calendar Grid Table */}
      <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Day Headers (Mon - Sun) */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center">
          {WEEKDAYS.map((dayName, idx) => (
            <div
              key={dayName}
              className={clsx(
                "py-3 text-xs font-bold uppercase tracking-wider text-gray-500",
                (idx === 5 || idx === 6) && "text-purple-600"
              )}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 bg-gray-100/50">
          {days.map((day) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const dayExpenses = getExpensesForDay(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={clsx(
                  "min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 bg-white transition-all flex flex-col justify-between cursor-pointer hover:bg-purple-50/30",
                  !inMonth && "bg-gray-50/70 text-gray-400 opacity-60",
                  today && "ring-2 ring-primary/40 ring-inset bg-purple-50/20"
                )}
              >
                {/* Top: Day Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all",
                      today
                        ? "bg-primary text-white shadow-xs"
                        : inMonth
                        ? "text-gray-900"
                        : "text-gray-400"
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  {dayExpenses.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-400">
                      {dayExpenses.length}
                    </span>
                  )}
                </div>

                {/* Middle: Expenses list badges inside cell */}
                <div className="mt-1 space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                  {dayExpenses.map((item) => {
                    const isPaid = item.isPaid;
                    const cat =
                      categories.find((c) => c.id === item.categoryId) ||
                      item.category;
                    const catIcon = cat?.icon || "📦";

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => handleItemToggle(e, item, day)}
                        disabled={updatingId === item.id}
                        className={clsx(
                          "w-full text-left rounded-lg px-1.5 py-1 text-[11px] font-semibold flex items-center justify-between gap-1 transition-all border shadow-2xs group",
                          isPaid
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200/80 opacity-70 line-through"
                            : "bg-amber-50/90 text-amber-900 border-amber-200 hover:border-amber-400 hover:bg-amber-100"
                        )}
                        title={`${item.description} - ${
                          item.currency === "USD" ? `$${item.amount}` : `Bs. ${item.amount}`
                        } (${isPaid ? "Pagado" : "Pendiente"})`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="shrink-0">{catIcon}</span>
                          <span className="truncate font-medium">
                            {item.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <span className="font-mono font-bold text-[10px]">
                            {item.currency === "USD"
                              ? `$${item.amount}`
                              : `Bs.${item.amount}`}
                          </span>
                          <span
                            className={clsx(
                              "h-2.5 w-2.5 rounded-full flex items-center justify-center shrink-0",
                              isPaid ? "bg-emerald-500 text-white" : "bg-amber-400"
                            )}
                          >
                            {isPaid && <Check className="h-2 w-2 stroke-[3]" />}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom spacer */}
                <div />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
