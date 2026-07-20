"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Calendar, Tag, CreditCard, DollarSign } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmit: (data: {
    description: string;
    amount: number;
    currency: "USD" | "VES";
    categoryId: string;
    date?: string;
  }) => Promise<void>;
  initialData?: {
    id: string;
    description: string;
    amount: number;
    currency: "USD" | "VES";
    categoryId: string;
    date: Date | string;
  } | null;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  categories,
  onSubmit,
  initialData,
}: ExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [date, setDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Set default or initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDescription(initialData.description);
        setAmount(initialData.amount.toString());
        setCurrency(initialData.currency);
        setCategoryId(initialData.categoryId);
        const d = new Date(initialData.date);
        setDate(d.toISOString().split("T")[0]);
      } else {
        const today = new Date().toISOString().split("T")[0];
        setDate(today);
        setDescription("");
        setAmount("");
        setCurrency("USD");
        setCategoryId(categories[0]?.id || "");
      }
      setError(null);
    }
  }, [isOpen, categories, initialData]);

  // Handle click outside to close
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Handle escape key to close
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Por favor, ingresa una descripción.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Por favor, ingresa un monto mayor a 0.");
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
        categoryId,
        date: date || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar el gasto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300 animate-fade-in">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {initialData ? "Editar Gasto" : "Registrar Nuevo Gasto"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {initialData ? "Modifica los detalles de este movimiento" : "Controla tus gastos bimonetarios al instante"}
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
              Descripción del Gasto
            </label>
            <input
              id="description"
              type="text"
              placeholder="Ej. Compra de verduras, pago de luz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-900"
              required
              autoFocus
            />
          </div>

          {/* Category Dropdown & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Date */}
            <div className="space-y-1.5">
              <label htmlFor="date" className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span>Fecha</span>
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-900"
                required
              />
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
            <div className="flex items-center gap-2 rounded-xl p-3 bg-gray-50 border border-gray-100 transition-all duration-300">
              <div
                className="w-3.5 h-3.5 rounded-full flex shrink-0"
                style={{ backgroundColor: selectedCategory.color || "#8b5cf6" }}
              />
              <span className="text-xs text-gray-600 font-medium">
                Se guardará bajo la categoría:{" "}
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 transition-all active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar Gasto</span>
            )}
          </button>
        </div>
      </div>
      
      {/* Dynamic Keyframe Animations for Entrance */}
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
