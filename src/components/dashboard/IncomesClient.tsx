"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  ArrowUpDown,
  X,
  Info,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  CreditCard,
  Banknote,
} from "lucide-react";
import { formatVES, formatUSD } from "@/lib/format";
import IncomeModal from "./IncomeModal";
import { createIncomeAction, updateIncomeAction, deleteIncomeAction } from "@/app/(dashboard)/actions";

interface Income {
  id: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  equivalentAmount: number;
  date: Date | string;
}

interface IncomesClientProps {
  initialIncomes: Income[];
  exchangeRate: number;
}

export default function IncomesClient({
  initialIncomes,
  exchangeRate,
}: IncomesClientProps) {
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);

  // Search and sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");

  // Warning state
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
        console.error("Error fetching live rate in IncomesClient:", error);
      }
    }
    fetchLiveRate();
  }, [exchangeRate]);

  // Handle new or edit income submission
  async function handleCreateOrUpdateIncome(data: {
    description: string;
    amount: number;
    currency: "USD" | "VES";
    date?: string;
  }) {
    setWarningMessage(null);
    let result;

    if (incomeToEdit) {
      result = await updateIncomeAction(incomeToEdit.id, data);
    } else {
      result = await createIncomeAction(data);
    }

    if (result.error) {
      throw new Error(result.error);
    }

    if (result.income) {
      const savedIncome = result.income as any;
      if (incomeToEdit) {
        setIncomes((prev) => prev.map((i) => i.id === savedIncome.id ? savedIncome : i));
      } else {
        setIncomes((prev) => [savedIncome, ...prev]);
      }
    }
  }

  // Handle delete income
  async function handleDeleteIncome(id: string) {
    const isConfirmed = window.confirm("¿Estás seguro de borrar este ingreso?");
    if (!isConfirmed) return;

    setWarningMessage(null);
    const result = await deleteIncomeAction(id);

    if (result.error) {
      setWarningMessage(result.error);
      setTimeout(() => setWarningMessage(null), 8000);
      return;
    }

    if (result.success) {
      setIncomes((prev) => prev.filter((i) => i.id !== id));
    }
  }

  // Filter and sort computation
  const filteredAndSortedIncomes = useMemo(() => {
    let result = [...incomes];

    // Search filter
    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      result = result.filter((inc) =>
        inc.description.toLowerCase().includes(query)
      );
    }

    // Currency filter
    if (selectedCurrency !== "ALL") {
      result = result.filter((inc) => inc.currency === selectedCurrency);
    }

    // Sort operations
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

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
  }, [incomes, searchTerm, selectedCurrency, sortBy]);

  // Helper to toggle sort modes
  function toggleSort(field: "date" | "amount") {
    if (field === "date") {
      setSortBy((prev) => (prev === "date-desc" ? "date-asc" : "date-desc"));
    } else {
      setSortBy((prev) => (prev === "amount-desc" ? "amount-asc" : "amount-desc"));
    }
  }

  // Compute totals
  const totalUSD = useMemo(() => {
    return incomes.reduce((sum, inc) => {
      return sum + (inc.currency === "USD" ? inc.amount : inc.amount / liveBcvRate);
    }, 0);
  }, [incomes, liveBcvRate]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Warning Banner */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Ingresos</h1>
          <p className="mt-1.5 text-sm text-gray-500 font-medium">
            Gestiona y visualiza todos tus ingresos bimonetarios
          </p>
        </div>

        <button
          onClick={() => {
            setIncomeToEdit(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Ingreso</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Banknote className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Ingresos (USD)</span>
          </div>
          <p className="text-2xl font-black text-gray-900">$ {formatUSD(totalUSD)}</p>
          <p className="text-xs text-gray-400 font-medium mt-1">≈ Bs. {formatVES(totalUSD * liveBcvRate)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Registros</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{incomes.length}</p>
          <p className="text-xs text-gray-400 font-medium mt-1">Ingresos registrados</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar ingresos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-gray-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Currency Filter */}
        <div className="flex h-10 items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5">
          {["ALL", "USD", "VES"].map((cur) => (
            <button
              key={cur}
              onClick={() => setSelectedCurrency(cur)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCurrency === cur
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {cur === "ALL" ? "Todas" : cur}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {filteredAndSortedIncomes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400 mb-4">
                <Banknote className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">No hay ingresos registrados</h3>
              <p className="text-xs text-gray-500 max-w-xs">
                Comienza registrando tu primer ingreso con el botón &quot;Nuevo Ingreso&quot;
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
                {filteredAndSortedIncomes.map((income) => {
                  const incomeDate = new Date(income.date);
                  const isVES = income.currency === "VES";

                  return (
                    <tr
                      key={income.id}
                      className="group hover:bg-emerald-50/10 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-600">
                          {incomeDate.toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {income.description}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Ref: {income.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end">
                          <span className={isVES ? "text-sm font-bold text-gray-900" : "text-xs text-gray-400 font-medium"}>
                            Bs. {formatVES(isVES ? income.amount : income.amount * liveBcvRate)}
                          </span>
                          <span className={!isVES ? "text-sm font-bold text-gray-900" : "text-xs text-gray-400 font-medium"}>
                            $ {formatUSD(!isVES ? income.amount : income.amount / liveBcvRate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setIncomeToEdit(income);
                              setIsModalOpen(true);
                            }}
                            className="text-gray-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(income.id)}
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

        {/* Table Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <p className="text-xs font-semibold text-gray-500">
            Mostrando <span className="text-gray-800 font-bold">{filteredAndSortedIncomes.length}</span> de <span className="text-gray-800 font-bold">{incomes.length}</span> resultados
          </p>
        </div>
      </div>

      {/* Income Modal */}
      <IncomeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIncomeToEdit(null);
        }}
        onSubmit={handleCreateOrUpdateIncome}
        initialData={
          incomeToEdit
            ? {
                id: incomeToEdit.id,
                description: incomeToEdit.description,
                amount: incomeToEdit.amount,
                currency: incomeToEdit.currency as "USD" | "VES",
                date: incomeToEdit.date,
              }
            : null
        }
      />

      {/* Animations */}
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
