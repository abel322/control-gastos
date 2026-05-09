import { BarChart3 } from "lucide-react";

export default function ExpenseChart() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Gastos por Categoría</h3>
        <p className="mt-1 text-sm text-gray-500">Distribución del mes actual</p>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 mb-5">
          <BarChart3 className="h-10 w-10 text-gray-300" />
        </div>
        <p className="text-base font-semibold text-gray-400">
          No hay gastos registrados
        </p>
        <p className="mt-2 text-sm text-gray-400 text-center max-w-xs">
          Registra tu primer gasto para ver el análisis
        </p>
      </div>
    </div>
  );
}
