"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Tag, CreditCard, DollarSign, CalendarDays } from "lucide-react";

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
  categoryId: string;
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
    categoryId: string;
  }) => Promise<void>;
  initialData?: InitialFixedData | null;
}

export default function FixedExpenseModal({
  isOpen,
  onClose,
  categories,
  onSubmit,
  initialData,
}: FixedExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDescription(initialData.description);
        setAmount(initialData.amount.toString());
        setCurrency(initialData.currency);
        setFrequency(initialData.frequency);
        setCategoryId(initialData.categoryId || categories[0]?.id || "");
      } else {
        setDescription("");
        setAmount("");
        setCurrency("USD");
        setFrequency("WEEKLY");
        setCategoryId(categories[0]?.id || "");
      }
      setError(null);
    }
  }, [isOpen, categories, initialData]);

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

    setIsSubmitting(true);
    try {
      await onSubmit({
        description: description.trim(),
        amount: numericAmount,
        currency,
        frequency,
        categoryId,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar el gasto fijo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

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
                ? "Modifica los detalles de este compromiso recurrente"
                : "Registra tus pagos recurrentes obligatorios semanales o mensuales"}
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

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Descripción / Nombre del Compromiso
            </label>
            <input
              id="description"
              type="text"
              placeholder="Ej. Mercado Semanal, Internet Inter, Condominio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-900"
              required
              autoFocus
            />
          </div>

          {/* Frequency & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Frequency Toggle */}
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
