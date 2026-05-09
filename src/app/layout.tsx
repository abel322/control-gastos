import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { getLatestExchangeRate } from "./actions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Control de Gastos Bimonetario",
  description:
    "Aplicación de seguimiento de gastos en Bolívares y Dólares con conversión en tiempo real basada en la tasa BCV.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const exchangeRate = await getLatestExchangeRate();

  return (
    <html lang="es" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="h-full font-sans antialiased">
        <div className="flex h-full">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <Header exchangeRate={exchangeRate} />

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto bg-[#f9fafb] p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
