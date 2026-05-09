import { getExpenses } from "../actions";
import { formatVES, formatUSD } from "@/lib/format";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  Calendar,
  Tag,
  CreditCard,
  ArrowUpDown
} from "lucide-react";

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona y visualiza todos tus movimientos bimonetarios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all">
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all active:scale-95">
            <Plus className="h-4 w-4" />
            <span>Nuevo Gasto</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Table Toolbar */}
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripción..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Filter className="h-4 w-4" />
              <span>Filtrar</span>
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <ArrowUpDown className="h-4 w-4" />
              <span>Ordenar</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Fecha</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  Descripción
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Categoría</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Monto</span>
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-gray-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense: any) => (
                <tr key={expense.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {new Date(expense.date).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                        {expense.description}
                      </span>
                      <span className="text-xs text-gray-400">Ref: {expense.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ 
                        backgroundColor: `${expense.category.color}15`, 
                        color: expense.category.color 
                      }}
                    >
                      <span 
                        className="h-1.5 w-1.5 rounded-full" 
                        style={{ backgroundColor: expense.category.color }} 
                      />
                      {expense.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end">
                      <span className={expense.currency === "VES" ? "text-sm font-semibold text-gray-900" : "text-xs text-gray-500"}>
                        {formatVES(expense.currency === "VES" ? expense.amount : expense.amount * expense.exchangeRate)} BS
                      </span>
                      <span className={expense.currency === "USD" ? "text-sm font-semibold text-gray-900" : "text-xs text-gray-500"}>
                        {formatUSD(expense.currency === "USD" ? expense.amount : expense.amount / expense.exchangeRate)} USD
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination Mock */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-6 py-4">
          <p className="text-sm text-gray-500">
            Mostrando <span className="font-medium">{expenses.length}</span> resultados
          </p>
          <div className="flex gap-2">
            <button className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-400 cursor-not-allowed">
              Anterior
            </button>
            <button className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
