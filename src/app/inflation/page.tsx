"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  ArrowDownCircle, 
  Calculator, 
  Calendar, 
  DollarSign, 
  Info,
  RefreshCw,
  TrendingDown
} from "lucide-react";
import { formatVES, formatUSD, formatRate } from "@/lib/format";

export default function InflationCalculatorPage() {
  // Common state
  const [currentRate, setCurrentRate] = useState(1420.00);

  // Loss of Value State
  const [vesAmount, setVesAmount] = useState<number>(1000);
  const [pastRate, setPastRate] = useState<number>(36.50);
  const [lossResult, setLossResult] = useState<{
    originalUsd: number;
    currentUsd: number;
    lossPercentage: number;
    lossAmount: number;
  } | null>(null);

  // Projection State
  const [currentExpense, setCurrentExpense] = useState<number>(100);
  const [monthlyInflation, setMonthlyInflation] = useState<number>(3.5);
  const [months, setMonths] = useState<number>(6);
  const [projectionResult, setProjectionResult] = useState<{
    futureExpense: number;
    increaseAmount: number;
    cumulativeInflation: number;
  } | null>(null);

  // Calculate Loss of Value
  useEffect(() => {
    const originalUsd = vesAmount / pastRate;
    const currentUsd = vesAmount / currentRate;
    const lossAmount = originalUsd - currentUsd;
    const lossPercentage = (lossAmount / originalUsd) * 100;

    setLossResult({
      originalUsd,
      currentUsd,
      lossPercentage,
      lossAmount
    });
  }, [vesAmount, pastRate, currentRate]);

  // Calculate Projection
  useEffect(() => {
    const cumulativeInflation = Math.pow(1 + monthlyInflation / 100, months) - 1;
    const futureExpense = currentExpense * (1 + cumulativeInflation);
    const increaseAmount = futureExpense - currentExpense;

    setProjectionResult({
      futureExpense,
      increaseAmount,
      cumulativeInflation: cumulativeInflation * 100
    });
  }, [currentExpense, monthlyInflation, months]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculadora de Inflación</h1>
        <p className="mt-1 text-sm text-gray-500">
          Herramientas para entender el impacto de la inflación en tus finanzas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Section 1: Loss of Value */}
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-primary/5 p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-primary">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Pérdida de Valor</h3>
                <p className="text-xs text-gray-500">Poder adquisitivo frente al Dólar</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cantidad en VES</label>
                <div className="relative">
                  <input
                    type="number"
                    value={vesAmount}
                    onChange={(e) => setVesAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-4 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">VES</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tasa Pasada (BCV)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pastRate}
                    onChange={(e) => setPastRate(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-4 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">BS/$</span>
                </div>
              </div>
            </div>

            {lossResult && (
              <div className="rounded-xl bg-gray-50 p-6 border border-gray-100">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Valía originalmente</span>
                    <span className="text-sm font-bold text-gray-900">{formatUSD(lossResult.originalUsd)} USD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Vale hoy (a {formatRate(currentRate)})</span>
                    <span className="text-sm font-bold text-gray-900">{formatUSD(lossResult.currentUsd)} USD</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-red-600">Pérdida neta</span>
                      <div className="text-right">
                        <p className="text-lg font-black text-red-600">-{Math.round(lossResult.lossPercentage)}%</p>
                        <p className="text-xs text-red-400">Has perdido {formatUSD(lossResult.lossAmount)} USD</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4">
              <Info className="h-5 w-5 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Este cálculo muestra cuánto se ha devaluado tu dinero en bolívares comparando cuántos dólares podías comprar antes vs ahora.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Future Projection */}
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-primary/5 p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Proyección de Gastos</h3>
                <p className="text-xs text-gray-500">Estimación de costos futuros</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gasto Actual Mensual</label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentExpense}
                    onChange={(e) => setCurrentExpense(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-4 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">USD/BS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inflación Mensual Est.</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={monthlyInflation}
                      onChange={(e) => setMonthlyInflation(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 py-2.5 pl-4 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tiempo (Meses)</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 py-2.5 px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none bg-white"
                  >
                    {[1, 3, 6, 12, 24].map(m => (
                      <option key={m} value={m}>{m} meses</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {projectionResult && (
              <div className="rounded-xl bg-gray-900 p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center opacity-70">
                    <span className="text-sm">Gasto proyectado en {months} meses</span>
                  </div>
                  <p className="text-3xl font-black">{formatUSD(projectionResult.futureExpense)}</p>
                  
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="opacity-60">Incremento total</span>
                      <span className="font-bold text-red-400">+{formatUSD(projectionResult.increaseAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="opacity-60">Inflación acumulada</span>
                      <span className="font-bold text-red-400">{projectionResult.cumulativeInflation.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <Calculator className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-5" />
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-400 italic">
              <RefreshCw className="h-3 w-3" />
              Los cálculos se actualizan automáticamente al cambiar los valores.
            </div>
          </div>
        </div>
      </div>

      {/* Educational Footer */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8">
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          ¿Por qué es importante calcular esto?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-bold text-primary uppercase">Preservación</p>
            <p className="text-xs text-gray-500 leading-relaxed">Entender la devaluación te ayuda a decidir cuándo convertir tus bolívares a activos más estables o moneda extranjera.</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-primary uppercase">Planificación</p>
            <p className="text-xs text-gray-500 leading-relaxed">Si sabes que tus gastos subirán por inflación, puedes ajustar tus presupuestos hoy para que no te sorprendan mañana.</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-primary uppercase">Realidad Bimonetaria</p>
            <p className="text-xs text-gray-500 leading-relaxed">En Venezuela, los precios en dólares también sufren variaciones. Esta herramienta te permite proyectar ambos escenarios.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
