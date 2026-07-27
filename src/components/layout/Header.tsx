"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Settings,
  Wallet,
  RefreshCw,
  Menu,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { formatRate, formatUSD, formatVES } from "@/lib/format";
import { getPendingFixedExpenses } from "@/app/(dashboard)/actions";

interface HeaderProps {
  exchangeRate: number;
  onOpenMobileMenu?: () => void;
}

interface PendingItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  frequency: string;
  category?: { name: string; icon?: string | null; color?: string | null };
}

export default function Header({ exchangeRate, onOpenMobileMenu }: HeaderProps) {
  const [currency, setCurrency] = useState<"VES" | "USD">("VES");
  const [rates, setRates] = useState<{ bcv: number; usdt: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Notifications State
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function fetchRates() {
    setLoading(true);
    try {
      const response = await fetch("https://ve.dolarapi.com/v1/dolares");
      if (!response.ok) throw new Error("Failed to fetch rates");
      const data = await response.json();

      const oficialRate = data.find((d: any) => d.fuente === "oficial")?.promedio ?? exchangeRate;
      const paraleloRate = data.find((d: any) => d.fuente === "paralelo")?.promedio ?? (exchangeRate * 1.14);

      setRates({ bcv: oficialRate, usdt: paraleloRate });

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }));
    } catch (error) {
      console.error("Error fetching live exchange rates in Header:", error);
      setRates({ bcv: exchangeRate, usdt: exchangeRate * 1.14 });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingNotifications() {
    try {
      const items = await getPendingFixedExpenses();
      setPendingItems(items as any);
    } catch (error) {
      console.error("Error fetching pending notifications:", error);
    }
  }

  useEffect(() => {
    fetchRates();
    fetchPendingNotifications();
  }, [exchangeRate]);

  // Click outside & Escape key to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const bcvVal = rates?.bcv ?? exchangeRate;
  const usdtVal = rates?.usdt ?? (exchangeRate * 1.14);
  const pendingCount = pendingItems.length;

  return (
    <header className="border-b border-gray-200 bg-white relative z-40">
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

          {/* Notification Bell Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="relative rounded-xl p-2 text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
              title="Recordatorios de pagos pendientes"
            >
              <Bell className="h-5 w-5" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white animate-pulse ring-2 ring-white">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gray-50/80">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Recordatorios de Pago
                    </span>
                  </div>
                  {pendingCount > 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700">
                      {pendingCount} pendientes
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                      Al día
                    </span>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {pendingCount === 0 ? (
                    <div className="p-6 text-center">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-gray-800">¡Todo al día!</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        No tienes compromisos fijos pendientes por pagar.
                      </p>
                    </div>
                  ) : (
                    pendingItems.map((item) => (
                      <Link
                        key={item.id}
                        href="/budgets"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="flex items-center gap-3 p-3.5 hover:bg-purple-50/50 transition-colors group"
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-sm"
                          style={{ backgroundColor: item.category?.color || "#8b5cf6" }}
                        >
                          {item.category?.icon || "📦"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="text-xs font-bold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                              {item.description}
                            </h5>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                              {item.frequency === "WEEKLY" ? "Semanal" : "Mensual"}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Pendiente:{" "}
                            <span className="font-extrabold text-gray-800">
                              {item.currency === "USD" ? `$${formatUSD(item.amount)}` : `Bs. ${formatVES(item.amount)}`}
                            </span>
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                {/* Footer Action */}
                <div className="border-t border-gray-100 bg-gray-50/80 p-2.5 text-center">
                  <Link
                    href="/budgets"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors w-full py-1"
                  >
                    <span>Ir a Gastos Fijos</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

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
