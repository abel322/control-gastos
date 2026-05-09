import { Inbox, MessageSquare, Plus, Search, Filter } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bandeja de Entrada</h1>
          <p className="mt-1 text-sm text-gray-500">
            Procesa tus SMS bancarios para registrar gastos automáticamente
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all active:scale-95">
          <Plus className="h-4 w-4" />
          <span>Pegar SMS</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por banco o monto..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              <span>Filtrar</span>
            </button>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <span className="text-sm text-gray-500">0 mensajes</span>
          </div>
        </div>

        {/* List Content / Empty State */}
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay mensajes</h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            Copia el texto de un SMS de tu banco (Bancamiga, Mercantil, etc.) y pégalo aquí para procesar el gasto automáticamente.
          </p>
          <button className="mt-6 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
            <Plus className="h-4 w-4" />
            <span>Comenzar ahora</span>
          </button>
        </div>
      </div>

      {/* Helper Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-blue-600">
            <Inbox className="h-5 w-5" />
          </div>
          <h4 className="mt-4 font-semibold text-gray-900">Bancamiga</h4>
          <p className="mt-2 text-sm text-gray-500">
            Detección automática de montos en VES y USD, fecha y comercio.
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-red-600">
            <Inbox className="h-5 w-5" />
          </div>
          <h4 className="mt-4 font-semibold text-gray-900">Mercantil</h4>
          <p className="mt-2 text-sm text-gray-500">
            Procesa transferencias y pagos móviles recibidos o enviados.
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-green-600">
            <Inbox className="h-5 w-5" />
          </div>
          <h4 className="mt-4 font-semibold text-gray-900">Otros Bancos</h4>
          <p className="mt-2 text-sm text-gray-500">
            Soporte para BNC, Provincial y Venezuela en desarrollo.
          </p>
        </div>
      </div>
    </div>
  );
}
