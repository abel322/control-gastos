"use client";

import { useState } from "react";
import { ArrowLeftRight, Bell, Settings, Wallet } from "lucide-react";
import { formatRate } from "@/lib/format";

interface HeaderProps {
  exchangeRate: number;
}

export default function Header({ exchangeRate }: HeaderProps) {
  const [currency, setCurrency] = useState<"VES" | "USD">("VES");

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left side - BCV Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-100">
          <ArrowLeftRight className="h-4 w-4" />
          <span>BCV: {formatRate(exchangeRate)} Bs/$</span>
        </div>
      </div>

      {/* Right side - Currency toggle + icons */}
      <div className="flex items-center gap-4">
        {/* Currency Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setCurrency("VES")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                currency === "VES"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              VES
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                currency === "USD"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              USD
            </button>
          </div>
          {currency === "VES" && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        {/* Settings Gear */}
        <button className="rounded-lg p-2 text-primary/70 hover:bg-primary/5 transition-colors">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
