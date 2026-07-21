"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, Bell, Settings, Wallet, RefreshCw, Menu } from "lucide-react";
import { formatRate } from "@/lib/format";

interface HeaderProps {
  exchangeRate: number;
  onOpenMobileMenu?: () => void;
}

export default function Header({ exchangeRate, onOpenMobileMenu }: HeaderProps) {
  const [currency, setCurrency] = useState<"VES" | "USD">("VES");
  const [rates, setRates] = useState<{ bcv: number; usdt: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function fetchRates() {
    setLoading(true);
    try {
      const response = await fetch("https://ve.dolarapi.com/v1/dolares");
      if (!response.ok) throw new Error("Failed to fetch rates");
      const data = await response.json();
      
      // Get oficial (BCV) and paralelo (USDT/Paralelo)
      const oficialRate = data.find((d: any) => d.fuente === "oficial")?.promedio ?? exchangeRate;
      const paraleloRate = data.find((d: any) => d.fuente === "paralelo")?.promedio ?? (exchangeRate * 1.14);
      
      setRates({ bcv: oficialRate, usdt: paraleloRate });
      
      // Save last update time formatted
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }));
    } catch (error) {
      console.error("Error fetching live exchange rates in Header:", error);
      // Fallback
      setRates({ bcv: exchangeRate, usdt: exchangeRate * 1.14 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRates();
  }, [exchangeRate]);

  const bcvVal = rates?.bcv ?? exchangeRate;
  const usdtVal = rates?.usdt ?? (exchangeRate * 1.14);

  return (
    <header className="border-b border-gray-200 bg-white">
      {/* Main Top Header Bar */}
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 gap-2">
        {/* Left side - Hamburger Button (mobile) + BCV & USDT Live Indicators (desktop) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden flex shrink-0 items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none active:scale-95"
            aria-label="Abrir menú principal"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Desktop Rates Indicators */}
          <div className="hidden md:flex items-center gap-3">
            {/* BCV Official Badge */}
            <div
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-700 transition-all hover:bg-purple-100/70"
              title="Dólar Oficial BCV"
            >
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="whitespace-nowrap">BCV: {formatRate(bcvVal)} Bs/$</span>
            </div>

            {/* USDT/Paralelo Cripto Badge */}
            <div
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100/70"
              title="Dólar USDT/Paralelo"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="whitespace-nowrap">USDT: {formatRate(usdtVal)} Bs/$</span>
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchRates}
              disabled={loading}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
              title={lastUpdated ? `Actualizado a las ${lastUpdated}. Clic para refrescar.` : "Refrescar tasas"}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Right side - Currency toggle + icons */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Currency Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => setCurrency("VES")}
                className={`flex items-center gap-1 rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold transition-all ${
                  currency === "VES"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                VES
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`flex items-center gap-1 rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold transition-all ${
                  currency === "USD"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                USD
              </button>
            </div>
            {currency === "VES" && (
              <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-purple-50 border border-purple-100">
                <Wallet className="h-3.5 w-3.5 text-purple-600" />
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <button className="relative rounded-lg p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5" />
          </button>

          {/* Settings Gear */}
          <button className="rounded-lg p-1.5 sm:p-2 text-purple-600/70 hover:bg-purple-50 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Sub-Header for Exchange Rates */}
      <div className="flex md:hidden items-center justify-between border-t border-gray-100 bg-gray-50/80 px-3 py-1.5 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          {/* BCV Badge Mobile */}
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-2 py-1 text-[11px] font-bold text-purple-700 transition-all"
            title="Dólar Oficial BCV"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
            <span className="whitespace-nowrap">BCV: {formatRate(bcvVal)} Bs/$</span>
          </div>

          {/* USDT Badge Mobile */}
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-700 transition-all"
            title="Dólar USDT/Paralelo"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="whitespace-nowrap">USDT: {formatRate(usdtVal)} Bs/$</span>
          </div>
        </div>

        {/* Refresh button & Last updated */}
        <div className="flex items-center gap-1.5 shrink-0">
          {lastUpdated && (
            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
              {lastUpdated}
            </span>
          )}
          <button
            onClick={fetchRates}
            disabled={loading}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refrescar tasas"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-purple-600" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
}

