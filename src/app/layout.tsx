import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Control de Gastos Bimonetario",
  description:
    "Aplicación de seguimiento de gastos en Bolívares y Dólares con conversión en tiempo real basada en la tasa BCV.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="h-full font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
