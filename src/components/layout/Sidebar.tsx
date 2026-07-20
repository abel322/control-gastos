"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  LayoutDashboard,
  Inbox,
  Receipt,
  PiggyBank,
  BarChart3,
  TrendingUp,
  Banknote,
  X,
} from "lucide-react";
import clsx from "clsx";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Bandeja de Entrada", href: "/inbox", icon: Inbox },
  { name: "Gastos", href: "/expenses", icon: Receipt },
  { name: "Ingresos", href: "/incomes", icon: Banknote },
  { name: "Presupuestos", href: "/budgets", icon: PiggyBank },
  { name: "Analítica", href: "/analytics", icon: BarChart3 },
  { name: "Calculadora de Inflación", href: "/inflation-calculator", icon: TrendingUp },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  onLinkClick,
  onClose,
  showCloseButton = false,
}: {
  onLinkClick?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header / Logo */}
      <div className="flex h-20 shrink-0 items-center justify-between px-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 leading-tight">Control</span>
            <span className="text-xs font-medium text-gray-500 leading-tight">Gastos Bimonetario</span>
          </div>
        </div>

        {showCloseButton && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onLinkClick}
                className={clsx(
                  isActive
                    ? "bg-primary/5 text-primary font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  "group flex items-center px-3 py-3 text-sm font-medium rounded-lg relative transition-colors"
                )}
              >
                <item.icon
                  className={clsx(
                    isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                    "mr-3 h-5 w-5 shrink-0 transition-colors"
                  )}
                  aria-hidden="true"
                />
                {item.name}
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-l-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-gray-100">
        <p className="text-xs text-center text-gray-400 font-medium">v1.0.0 MVP</p>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar (hidden on small screens, flex on md+) */}
      <aside className="hidden md:flex h-full w-64 flex-col border-r border-gray-200 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (visible only when isOpen is true on mobile) */}
      {isOpen && (
        <div className="relative z-50 md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer floating panel */}
          <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent onLinkClick={onClose} onClose={onClose} showCloseButton />
          </div>
        </div>
      )}
    </>
  );
}
