import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { getLatestExchangeRate } from "./actions";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const exchangeRate = await getLatestExchangeRate();

  return (
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
  );
}
