"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  CreditCard,
  ArrowUpDown,
  X,
  ChevronDown,
  Info,
  Pencil,
  Trash2
} from "lucide-react";
import { formatVES, formatUSD } from "@/lib/format";
import ExpenseModal from "./ExpenseModal";
import WeeklyIncome from "./WeeklyIncome";
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from "@/app/(dashboard)/actions";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  equivalentAmount: number;
  date: Date | string;
  category: {
    name: string;
    color: string | null;
    icon: string | null;
  };
  categoryId: string;
}

interface ExpensesClientProps {
  initialExpenses: Expense[];
  categories: Category[];
  exchangeRate: number;
}

export default function ExpensesClient({
  initialExpenses,
  categories,
  exchangeRate,
}: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  
  // Notice banner state for database fallbacks
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Live BCV rate state
  const [liveBcvRate, setLiveBcvRate] = useState<number>(exchangeRate);

  // Fetch live rate from ve.dolarapi.com
  useEffect(() => {
    async function fetchLiveRate() {
      try {
        const response = await fetch("https://ve.dolarapi.com/v1/dolares");
        if (!response.ok) throw new Error("Failed to fetch rates");
        const data = await response.json();
        const oficialRate = data.find((d: any) => d.fuente === "oficial")?.promedio;
        if (oficialRate && typeof oficialRate === "number") {
          setLiveBcvRate(oficialRate);
        }
      } catch (error) {
        console.error("Error fetching live rate in ExpensesClient:", error);
      }
    }
    fetchLiveRate();
  }, [exchangeRate]);

  // Handle new or edit expense submission
  async function handleCreateOrUpdateExpense(data: {
    description: string;
    amount: number;
    currency: "USD" | "VES";
    categoryId: string;
    date?: string;
  }) {
    setWarningMessage(null);
    let result;
    
    if (expenseToEdit) {
      result = await updateExpenseAction(expenseToEdit.id, data);
    } else {
      result = await createExpenseAction(data);
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (result.expense) {
      const savedExpense = result.expense as any;
      if (expenseToEdit) {
        setExpenses((prev) => prev.map((e) => e.id === savedExpense.id ? savedExpense : e));
      } else {
        setExpenses((prev) => [savedExpense, ...prev]);
      }
      
      if (result.warning) {
        setWarningMessage(result.warning);
        setTimeout(() => setWarningMessage(null), 8000);
      }
    }
  }

  // Handle delete expense
  async function handleDeleteExpense(id: string) {
    const isConfirmed = window.confirm("¿Estás seguro de borrar este gasto?");
    if (!isConfirmed) return;

    setWarningMessage(null);
    const result = await deleteExpenseAction(id);
    
    if (result.error) {
      setWarningMessage(result.error);
      setTimeout(() => setWarningMessage(null), 8000);
      return;
    }

    if (result.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      if (result.warning) {
        setWarningMessage(result.warning);
        setTimeout(() => setWarningMessage(null), 8000);
      }
    }
  }

  // Filter and sort computation
  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...expenses];

    // Search filter
    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      result = result.filter((exp) =>
        exp.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "ALL") {
      result = result.filter((exp) => exp.categoryId === selectedCategory);
    }

    // Currency filter
    if (selectedCurrency !== "ALL") {
      result = result.filter((exp) => exp.currency === selectedCurrency);
    }

    // Sort operations
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      // We calculate amounts in USD for unified comparison when sorting by amount
      const amountA = a.currency === "USD" ? a.amount : a.amount / a.exchangeRate;
      const amountB = b.currency === "USD" ? b.amount : b.amount / b.exchangeRate;

      switch (sortBy) {
        case "date-asc":
          return dateA - dateB;
        case "amount-desc":
          return amountB - amountA;
        case "amount-asc":
          return amountA - amountB;
        case "date-desc":
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [expenses, searchTerm, selectedCategory, selectedCurrency, sortBy]);

  // Export mock action
  function handleExport() {
    alert("Exportación de gastos iniciada (CSV/PDF). En producción esto descargará tu reporte.");
  }

  // Helper to toggle sort modes
  function toggleSort(field: "date" | "amount") {
    if (field === "date") {
      setSortBy((prev) => (prev === "date-desc" ? "date-asc" : "date-desc"));
    } else {
      setSortBy((prev) => (prev === "amount-desc" ? "amount-asc" : "amount-desc"));
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Alert for Demo Connection */}
      {warningMessage && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-3 shadow-sm animate-fade-in">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Nota del sistema:</span> {warningMessage}
          </div>
          <button 
            onClick={() => setWarningMessage(null)}
            className="text-amber-500 hover:text-amber-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid Container for Header and Weekly Income */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Page Title & Desc */}
        <div className="lg:col-span-2 space-y-3.5">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Gastos</h1>
            <p className="mt-1.5 text-sm text-gray-500 font-medium">
              Gestiona y visualiza todos tus movimientos bimonetarios al tipo de cambio actual
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-98"
            >
              <Download className="h-4 w-4 text-gray-500" />
              <span>Exportar</span>
            </button>
            <button
              onClick={() => {
                setExpenseToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-purple-700 transition-all active:scale-95 hover:shadow-purple-200 hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Gasto</span>
            </button>
          </div>
        </div>

        {/* Weekly Income Card */}
        <div className="lg:col-span-1">
          <WeeklyIncome bcvRate={liveBcvRate} />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm transition-all duration-300">
        {/* Table Toolbar */}
        <div className="flex flex-col gap-3.5 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/10 transition-all text-gray-900 bg-white placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all active:scale-98 ${
                showFilters || selectedCategory !== "ALL" || selectedCurrency !== "ALL"
                  ? "border-purple-200 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filtrar</span>
              {(selectedCategory !== "ALL" || selectedCurrency !== "ALL") && (
                <span className="h-2 w-2 rounded-full bg-purple-600" />
              )}
            </button>
            
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="inline-flex appearance-none items-center gap-2 rounded-xl border border-gray-200 bg-white pl-4 pr-9 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none cursor-pointer"
              >
                <option value="date-desc">Fecha: Más reciente</option>
                <option value="date-asc">Fecha: Más antiguo</option>
                <option value="amount-desc">Monto: Mayor a menor</option>
                <option value="amount-asc">Monto: Menor a mayor</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="border-b border-gray-100 bg-gray-50/20 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-down">
            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Filtrar por Categoría
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-250 bg-white pl-3 pr-9 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
                >
                  <option value="ALL">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              </div>
            </div>

            {/* Currency Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Filtrar por Moneda
              </label>
              <div className="flex rounded-xl border border-gray-250 bg-white p-0.5 h-[34px]">
                {["ALL", "USD", "VES"].map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setSelectedCurrency(cur)}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                      selectedCurrency === cur
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {cur === "ALL" ? "Todas" : cur}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Clear Filters Button */}
            {(selectedCategory !== "ALL" || selectedCurrency !== "ALL") && (
              <div className="sm:col-span-2 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedCategory("ALL");
                    setSelectedCurrency("ALL");
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Limpiar filtros</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          {filteredAndSortedExpenses.length === 0 ? (
            <div className="text-center py-12 bg-white">
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-400 mb-3">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">No se encontraron gastos</h3>
              <p className="text-xs text-gray-500 mt-1">
                Intenta ajustando tu búsqueda o filtros actuales.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th 
                    onClick={() => toggleSort("date")}
                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span>Fecha</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Descripción
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <TagIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span>Categoría</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort("amount")}
                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right cursor-pointer hover:text-gray-600 select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                      <span>Monto</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredAndSortedExpenses.map((expense) => {
                  const expenseDate = new Date(expense.date);
                  const isVES = expense.currency === "VES";
                  
                  return (
                    <tr
                      key={expense.id}
                      className="group hover:bg-purple-50/10 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-600">
                          {expenseDate.toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                            {expense.description}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Ref: {expense.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${expense.category.color}12` || "#8b5cf612",
                            color: expense.category.color || "#8b5cf6",
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: expense.category.color || "#8b5cf6" }}
                          />
                          {expense.category.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end">
                          <span className={isVES ? "text-sm font-bold text-gray-900" : "text-xs text-gray-400 font-medium"}>
                            Bs. {formatVES(isVES ? expense.amount : expense.amount * liveBcvRate)}
                          </span>
                          <span className={!isVES ? "text-sm font-bold text-gray-900" : "text-xs text-gray-400 font-medium"}>
                            $ {formatUSD(!isVES ? expense.amount : expense.amount / liveBcvRate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setExpenseToEdit(expense);
                              setIsModalOpen(true);
                            }}
                            className="text-gray-400 hover:text-purple-600 transition-colors p-1.5 rounded-lg hover:bg-purple-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                            title="Borrar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <p className="text-xs font-semibold text-gray-500">
            Mostrando <span className="text-gray-800 font-bold">{filteredAndSortedExpenses.length}</span> de <span className="text-gray-800 font-bold">{expenses.length}</span> resultados
          </p>
          <div className="flex gap-2">
            <button className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-400 cursor-not-allowed">
              Anterior
            </button>
            <button className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExpenseToEdit(null);
        }}
        categories={categories}
        onSubmit={handleCreateOrUpdateExpense}
        initialData={
          expenseToEdit
            ? {
                id: expenseToEdit.id,
                description: expenseToEdit.description,
                amount: expenseToEdit.amount,
                currency: expenseToEdit.currency as "USD" | "VES",
                categoryId: expenseToEdit.categoryId,
                date: expenseToEdit.date,
              }
            : null
        }
      />
      
      {/* Styles for slide down and fade in animations */}
      <style jsx global>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
