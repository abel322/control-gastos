import { getBudgets } from "../actions";
import { formatVES, formatUSD } from "@/lib/format";
import { 
  Plus, 
  Settings2, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  LayoutGrid,
  List
} from "lucide-react";
import clsx from "clsx";

export default async function BudgetsPage() {
  const budgets = await getBudgets();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Controla tus límites de gasto mensuales por categoría
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
            <button className="rounded-md bg-gray-100 p-1.5 text-gray-900">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className="rounded-md p-1.5 text-gray-400 hover:text-gray-600">
              <List className="h-4 w-4" />
            </button>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all active:scale-95">
            <Plus className="h-4 w-4" />
            <span>Configurar Presupuesto</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Estado General</span>
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">Octubre</span>
            <span className="text-sm text-gray-500">2023</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-primary" style={{ width: "65%" }} />
            </div>
            <span className="text-xs font-semibold text-gray-700">65%</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Categoría Crítica</span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-600">Ocio</span>
            <span className="text-sm text-red-500">+10% exceso</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Has superado el límite de $15.00</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Bajo Control</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">2</span>
            <span className="text-sm text-green-500">Categorías</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Alimentación y Servicios están en meta.</p>
        </div>
      </div>

      {/* Budget Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {budgets.map((budget: any) => {
          const isOverBudget = budget.percentageUSD > 100;
          const progressColor = isOverBudget ? "bg-red-500" : "bg-primary";
          const textColor = isOverBudget ? "text-red-600" : "text-primary";

          return (
            <div key={budget.id} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div 
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: budget.category.color }}
                  >
                    <Settings2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{budget.category.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Presupuesto Mensual</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={clsx(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                    isOverBudget ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                  )}>
                    {isOverBudget ? "Excedido" : "En meta"}
                  </span>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-6">
                {/* USD Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-600">Dólares (USD)</span>
                    <span className="text-gray-900 font-bold">
                      {formatUSD(budget.spentUSD)} / {formatUSD(budget.amountUSD)}
                    </span>
                  </div>
                  <div className="relative h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div 
                      className={clsx("h-full transition-all duration-500 ease-out", progressColor)}
                      style={{ width: `${Math.min(budget.percentageUSD, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Progreso</span>
                    <span className={clsx("text-xs font-bold", textColor)}>{Math.round(budget.percentageUSD)}%</span>
                  </div>
                </div>

                {/* VES Progress */}
                <div className="pt-2 border-t border-gray-50">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-600">Bolívares (VES)</span>
                    <span className="text-gray-900 font-bold">
                      {formatVES(budget.spentVES)} / {formatVES(budget.amountVES)}
                    </span>
                  </div>
                  <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div 
                      className={clsx("h-full opacity-60 transition-all duration-500 ease-out", progressColor)}
                      style={{ width: `${Math.min(budget.percentageVES, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Decorative background icon */}
              <TrendingUp className="absolute -right-4 -bottom-4 h-24 w-24 text-gray-50 opacity-10 group-hover:opacity-20 transition-opacity" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
