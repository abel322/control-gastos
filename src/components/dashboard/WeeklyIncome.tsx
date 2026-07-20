"use client";

import React from "react";
import { DollarSign, ArrowLeftRight, TrendingUp } from "lucide-react";
import { formatUSD, formatVES } from "@/lib/format";
import Link from "next/link";

interface WeeklyIncomeProps {
  bcvRate: number;
  totalIncomeUSD: number;
}

export default function WeeklyIncome({ bcvRate, totalIncomeUSD }: WeeklyIncomeProps) {
  const equivalentVES = totalIncomeUSD * bcvRate;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-150 transition-all duration-300 hover:shadow-md hover:border-purple-200 group">
      {/* Background soft glow decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl -mr-5 -mt-5 opacity-70 transition-all duration-300 group-hover:bg-purple-100" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex flex-col flex-1 min-w-0 pr-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
            Total Ingresos
          </span>

          <div className="mt-2.5 flex items-baseline gap-1 select-none">
            <span className="text-2xl font-black text-gray-900 leading-none">
              $ {formatUSD(totalIncomeUSD)}
            </span>
          </div>

          {/* VES Equivalent estimate */}
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-1 font-medium">
            <ArrowLeftRight className="h-3 w-3 text-gray-400" />
            <span>≈ Bs. {formatVES(equivalentVES)}</span>
            <span className="text-[9px] text-gray-400 font-normal">(tasa BCV)</span>
          </div>

          {/* Link to incomes page */}
          <Link
            href="/incomes"
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 hover:text-purple-800 transition-colors"
          >
            Basado en tus ingresos registrados →
          </Link>
        </div>

        {/* Decorative dollar token icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 border border-purple-100 shadow-sm text-purple-600 transition-all duration-300 group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600">
          <DollarSign className="h-5 w-5" />
        </div>
      </div>
      
      {/* Top micro-bar accent */}
      <div className="absolute top-0 left-0 h-1 w-full bg-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </div>
  );
}
