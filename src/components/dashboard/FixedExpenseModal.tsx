"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Tag, CreditCard, DollarSign, CalendarDays, Calendar } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export interface InitialFixedData {
  id?: string;
  description: string;
  amount: number;
  currency: "USD" | "VES";
  frequency: "WEEKLY" | "MONTHLY";
  type?: "RECURRING" | "ONE_TIME" | "INSTALLMENT";
  categoryId: string;
  dueDate?: string | Date | null;
  recurringDayOfWeek?: string | null;
  recurringDayOfMonth?: number | null;
}

interface FixedExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmit: (data: {
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
  }) => Promise<void>;
  initialData?: InitialFixedData | null;
  defaultDueDate?: Date;
}

export default function FixedExpenseModal({
  isOpen,
  onClose,
  categories,
  onSubmit,
  initialData,
  defaultDueDate,
}: FixedExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [type, setType] = useState<"RECURRING" | "ONE_TIME" | "INSTALLMENT">("RECURRING");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [dueDate, setDueDate] = useState<string>("");

  // Recurring specific state
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState<string>("1"); // 1 (Lunes) to 7 (Domingo)
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState<string>("1"); // 1 to 31

  // Installment specific state
  const [startDate, setStartDate] = useState<string>("");
  const [installmentFrequency, setInstallmentFrequency] = useState<"BIWEEKLY" | "MONTHLY">("BIWEEKLY");
  const [totalInstallments, setTotalInstallments] = useState<string>("3");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const today = defaultDueDate || new Date();
      const todayIso = today.toISOString().split("T")[0];
      const jsDay = today.getDay();
      const isoDay = jsDay === 0 ? "7" : jsDay.toString();

      if (initialData) {
        setDescription(initialData.description);
        setAmount(initialData.amount.toString());
        setCurrency(initialData.currency);
        setFrequency(initialData.frequency);
        setType((initialData.type as any) || "RECURRING");
        setCategoryId(initialData.categoryId || categories[0]?.id || "");
        setDueDate(
          initialData.dueDate
            ? new Date(initialData.dueDate).toISOString().split("T")[0]
            : todayIso
        );
        setStartDate(todayIso);

        if (initialData.dueDate) {
          const d = new Date(initialData.dueDate);
          const dDay = d.getDay();
          setRecurringDayOfWeek(dDay === 0 ? "7" : dDay.toString());
          setRecurringDayOfMonth(d.getDate().toString());
        } else {
          setRecurringDayOfWeek(isoDay);
          setRecurringDayOfMonth(today.getDate().toString());
        }
      } else {
        setDescription("");
        setAmount("");
        setCurrency("USD");
        setFrequency("WEEKLY");
        setType("RECURRING");
        setCategoryId(categories[0]?.id || "");
        setDueDate(todayIso);
        setStartDate(todayIso);
        setRecurringDayOfWeek(isoDay);
        setRecurringDayOfMonth(today.getDate().toString());
        setInstallmentFrequency("BIWEEKLY");
        setTotalInstallments("3");
      }
      setError(null);
    }
  }, [isOpen, categories, initialData, defaultDueDate]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Por favor, ingresa una descripción para el compromiso.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Por favor, ingresa un monto válido mayor a 0.");
      return;
    }

    if (!categoryId) {
      setError("Por favor, selecciona una categoría.");
      return;
    }

    let calculatedDueDate: string | undefined = undefined;
    let submitRecurringDayOfWeek: string | null = null;
    let submitRecurringDayOfMonth: number | null = null;
    let submitStartDate: string | null = null;
    let submitInstallmentFrequency: "BIWEEKLY" | "MONTHLY" | null = null;
    let submitTotalInstallments: number | null = null;

    if (type === "RECURRING") {
      const ref = defaultDueDate ? new Date(defaultDueDate) : new Date();

      if (frequency === "WEEKLY") {
        const dayOfWeekNum = parseInt(recurringDayOfWeek, 10);
        if (isNaN(dayOfWeekNum) || dayOfWeekNum < 1 || dayOfWeekNum > 7) {
          setError("Por favor, selecciona un día de la semana válido.");
          return;
        }

        // Calculate date of selected weekday in the reference week (Monday = 1)
        const refCopy = new Date(ref);
        const day = refCopy.getDay();
        const diff = refCopy.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(refCopy.setDate(diff));
        monday.setHours(12, 0, 0, 0);

        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + (dayOfWeekNum - 1));
        calculatedDueDate = targetDate.toISOString();
        submitRecurringDayOfWeek = recurringDayOfWeek;
        submitRecurringDayOfMonth = null;
      } else if (frequency === "MONTHLY") {
        const dayOfMonthNum = parseInt(recurringDayOfMonth, 10);
        if (isNaN(dayOfMonthNum) || dayOfMonthNum < 1 || dayOfMonthNum > 31) {
          setError("Por favor, ingresa un día de corte válido entre 1 y 31.");
          return;
        }

        const refCopy = new Date(ref);
        const targetDate = new Date(refCopy.getFullYear(), refCopy.getMonth(), dayOfMonthNum, 12, 0, 0);
        calculatedDueDate = targetDate.toISOString();
        submitRecurringDayOfMonth = dayOfMonthNum;
        submitRecurringDayOfWeek = null;
      }
    } else if (type === "ONE_TIME") {
      if (!dueDate) {
        setError("Por favor, selecciona una fecha o semana de vencimiento para el pago puntual.");
        return;
      }
      calculatedDueDate = dueDate;
      submitRecurringDayOfWeek = null;
      submitRecurringDayOfMonth = null;
    } else if (type === "INSTALLMENT") {
      const parsedInstallments = parseInt(totalInstallments, 10);
      if (isNaN(parsedInstallments) || parsedInstallments <= 0) {
        setError("Ingresa un número válido de cuotas (ej. 3, 6, 12).");
        return;
      }
      if (!startDate) {
        setError("Por favor, selecciona la fecha de inicio de la primera cuota.");
        return;
      }
      submitStartDate = startDate;
      submitInstallmentFrequency = installmentFrequency;
      submitTotalInstallments = parsedInstallments;
      submitRecurringDayOfWeek = null;
      submitRecurringDayOfMonth = null;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        description: description.trim(),
        amount: numericAmount,
        currency,
        frequency,
        type,
        categoryId,
        dueDate: calculatedDueDate,
        startDate: submitStartDate || undefined,
        installmentFrequency: submitInstallmentFrequency || undefined,
        totalInstallments: submitTotalInstallments || undefined,
        recurringDayOfWeek: submitRecurringDayOfWeek || undefined,
        recurringDayOfMonth: submitRecurringDayOfMonth || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar el gasto fijo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const numAmount = parseFloat(amount) || 0;
  const numInstallments = parseInt(totalInstallments, 10) || 1;
  const perInstallmentAmount = numAmount > 0 && numInstallments > 0 ? numAmount / numInstallments : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {initialData ? "Editar Gasto Fijo / Compromiso" : "Configurar Gasto Fijo / Compromiso"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {initialData
                ? "Modifica los detalles de este compromiso recurrente o puntual"
                : "Registra pagos recurrentes, puntuales o financiamientos por cuotas (Cashea)"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-600 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (Recurrente vs Pago Puntual vs Deuda/Cuotas) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tipo de Compromiso
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType("RECURRING")}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                  type === "RECURRING"
                    ? "bg-white text-primary shadow-xs border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🔄 Recurrente</span>
                <span className="text-[9px] font-normal text-gray-500">Todas las semanas</span>
              </button>

              <button
                type="button"
                onClick={() => setType("ONE_TIME")}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                  type === "ONE_TIME"
                    ? "bg-white text-purple-700 shadow-xs border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>📌 Puntual</span>
                <span className="text-[9px] font-normal text-gray-500">Una fecha exacta</span>
              </button>

              <button
                type="button"
                onClick={() => setType("INSTALLMENT")}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                  type === "INSTALLMENT"
                    ? "bg-white text-emerald-700 shadow-xs border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>💳 Cuotas (Cashea)</span>
                <span className="text-[9px] font-normal text-gray-500">Financiamiento</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Descripción / Nombre del Compromiso
            </label>
            <input
              id="description"
              type="text"
              placeholder={
                type === "INSTALLMENT"
                  ? "Ej. Zapatos Zara, Teléfono Cashea..."
                  : type === "ONE_TIME"
                  ? "Ej. Reparación auto, Cuota escolar..."
                  : "Ej. Mercado Semanal, Internet Inter..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-900"
              required
              autoFocus
            />
          </div>

          {/* Conditional Fields for INSTALLMENT (Cashea) */}
          {type === "INSTALLMENT" && (
            <div className="space-y-4 bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Configuración de Financiamiento en Cuotas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="startDate" className="text-xs font-medium text-emerald-900">
                    Fecha 1ra Cuota
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="totalInstallments" className="text-xs font-medium text-emerald-900">
                    Número de Cuotas
                  </label>
                  <input
                    id="totalInstallments"
                    type="number"
                    min="1"
                    max="48"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-emerald-900">
                  Frecuencia de las Cuotas
                </label>
                <div className="flex h-9 items-center rounded-xl border border-emerald-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setInstallmentFrequency("BIWEEKLY")}
                    className={`flex-1 rounded-lg py-1 text-xs font-bold transition-all ${
                      installmentFrequency === "BIWEEKLY"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Cada 15 Días (Quincenal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallmentFrequency("MONTHLY")}
                    className={`flex-1 rounded-lg py-1 text-xs font-bold transition-all ${
                      installmentFrequency === "MONTHLY"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Cada Mes (Mensual)
                  </button>
                </div>
              </div>

              {numAmount > 0 && numInstallments > 0 && (
                <div className="rounded-lg bg-emerald-100/70 p-2.5 text-xs text-emerald-900 font-medium">
                  Se generarán <span className="font-bold">{numInstallments} cuotas</span> de{" "}
                  <span className="font-bold font-mono">${perInstallmentAmount.toFixed(2)}</span> cada una.
                </div>
              )}
            </div>
          )}

          {/* Conditional Date Picker for ONE_TIME */}
          {type === "ONE_TIME" && (
            <div className="space-y-1.5 bg-purple-50/60 border border-purple-100 rounded-xl p-3">
              <label htmlFor="dueDate" className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                <span>Fecha / Semana de Vencimiento</span>
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                required
              />
              <p className="text-[11px] text-purple-700">
                Este gasto solo aparecerá en la lista cuando se navegue a la semana que incluya esta fecha.
              </p>
            </div>
          )}

          {/* Frequency & Category Grid */}
          <div className={type === "INSTALLMENT" ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
            {/* Frequency Toggle - only for RECURRING and ONE_TIME */}
            {type !== "INSTALLMENT" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                  <span>Frecuencia de Pago</span>
                </label>
                <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setFrequency("WEEKLY")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                      frequency === "WEEKLY"
                        ? "bg-primary text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                    }`}
                  >
                    Semanal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency("MONTHLY")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                      frequency === "MONTHLY"
                        ? "bg-primary text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                    }`}
                  >
                    Mensual
                  </button>
                </div>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                <span>Categoría</span>
              </label>
              <div className="relative">
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 pl-4 pr-10 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white text-gray-900"
                  required
                >
                  <option value="" disabled>Seleccionar...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ""} {cat.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Conditional Day / Date Selection for RECURRING */}
          {type === "RECURRING" && (
            <div className="space-y-1.5 bg-purple-50/60 border border-purple-100 rounded-xl p-3.5 transition-all">
              {frequency === "WEEKLY" ? (
                <>
                  <label
                    htmlFor="recurringDayOfWeek"
                    className="text-xs font-semibold uppercase tracking-wider text-purple-900 flex items-center gap-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5 text-purple-600" />
                    <span>Día de Pago de la Semana</span>
                  </label>
                  <div className="relative">
                    <select
                      id="recurringDayOfWeek"
                      value={recurringDayOfWeek}
                      onChange={(e) => setRecurringDayOfWeek(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-purple-200 bg-white pl-4 pr-10 py-2.5 text-sm font-semibold text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20 transition-all"
                      required
                    >
                      <option value="1">Lunes</option>
                      <option value="2">Martes</option>
                      <option value="3">Miércoles</option>
                      <option value="4">Jueves</option>
                      <option value="5">Viernes</option>
                      <option value="6">Sábado</option>
                      <option value="7">Domingo</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[11px] text-purple-700">
                    Selecciona el día de la semana (Lunes a Domingo) en que se realizará este compromiso recurrente.
                  </p>
                </>
              ) : (
                <>
                  <label
                    htmlFor="recurringDayOfMonth"
                    className="text-xs font-semibold uppercase tracking-wider text-purple-900 flex items-center gap-1.5"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-purple-600" />
                    <span>Día de Corte / Pago del Mes (1 - 31)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="recurringDayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ej. 15"
                      value={recurringDayOfMonth}
                      onChange={(e) => setRecurringDayOfMonth(e.target.value)}
                      className="w-full rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20 transition-all placeholder-gray-400"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-purple-700">
                    Día del mes (1 al 31) en el que vence o se debita este compromiso cada mes.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Amount and Currency Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Amount Input */}
            <div className="space-y-1.5">
              <label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                <span>Monto</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 font-medium">
                  {currency === "USD" ? "$" : "Bs."}
                </div>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            {/* Currency Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                <span>Moneda</span>
              </label>
              
              <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    currency === "USD"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                  }`}
                >
                  Dólares (USD)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("VES")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    currency === "VES"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                  }`}
                >
                  Bolívares (VES)
                </button>
              </div>
            </div>
          </div>

          {/* Visual Indicator of Selected Category */}
          {selectedCategory && (
            <div className="flex items-center gap-2 rounded-xl p-3 bg-gray-50 border border-gray-100 transition-all">
              <div
                className="w-3.5 h-3.5 rounded-full flex shrink-0"
                style={{ backgroundColor: selectedCategory.color || "#8b5cf6" }}
              />
              <span className="text-xs text-gray-600 font-medium">
                Categoría asignada:{" "}
                <span className="font-bold text-gray-800">
                  {selectedCategory.name}
                </span>
              </span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-98 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>{initialData ? "Guardar Cambios" : "Guardar Compromiso"}</span>
            )}
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up {
          animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
