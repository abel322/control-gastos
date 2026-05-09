import { getAnalyticsSummary, getMonthlyEvolution } from "../actions";
import { formatVES, formatUSD } from "@/lib/format";
import { 
  CategoryPieChart, 
  EvolutionChart, 
  CurrencySplitChart 
} from "@/components/analytics/AnalyticsCharts";
import { 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter
} from "lucide-react";

export default async function AnalyticsPage() {
  const summary = await getAnalyticsSummary();
  const evolution = await getMonthlyEvolution();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
          <p className="mt-1 text-sm text-gray-500">
            Análisis profundo de tus hábitos de consumo y tendencias
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all">
            <Filter className="h-4 w-4" />
            <span>Últimos 6 meses</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              12%
            </span>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-500">Total en Dólares</p>
          <p className="text-2xl font-bold text-gray-900">{formatUSD(summary.totalUSD)} USD</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              8%
            </span>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-500">Total en Bolívares</p>
          <p className="text-2xl font-bold text-gray-900">{formatVES(summary.totalVES)} BS</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Distribución de Moneda (Nro. Transacciones)</p>
          </div>
          <CurrencySplitChart data={summary.currencySplit} />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Evolution Chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Evolución Mensual</h3>
              <p className="mt-1 text-sm text-gray-500">Tendencia de gastos en USD</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <EvolutionChart data={evolution} />
        </div>

        {/* Category Pie Chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Gastos por Categoría</h3>
              <p className="mt-1 text-sm text-gray-500">Distribución porcentual en USD</p>
            </div>
            <PieIcon className="h-5 w-5 text-gray-400" />
          </div>
          <CategoryPieChart data={summary.categories} />
        </div>
      </div>

      {/* Insights Section */}
      <div className="rounded-2xl bg-gray-900 p-8 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Análisis de Inteligencia</h3>
          <p className="text-gray-400 max-w-2xl">
            Tus gastos en la categoría <span className="text-primary font-bold">Alimentación</span> han aumentado un 15% respecto al mes pasado. 
            Te sugerimos revisar los presupuestos de Ocio para compensar este incremento. 
            El 60% de tus transacciones se realizan en Bolívares, aprovechando la estabilidad temporal de la tasa BCV.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute right-20 top-0 h-20 w-20 bg-blue-500/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
