import DashboardShell from "@/components/layout/DashboardShell";
import { getLatestExchangeRate } from "./actions";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const exchangeRate = await getLatestExchangeRate();

  return (
    <DashboardShell exchangeRate={exchangeRate}>
      {children}
    </DashboardShell>
  );
}
