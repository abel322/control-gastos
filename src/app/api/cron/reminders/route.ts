import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pendingExpenses = await prisma.fixedExpense.findMany({
      where: {
        isPaid: false,
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPendingUSD = pendingExpenses.reduce((acc, curr) => {
      return acc + (curr.currency === "USD" ? curr.amount : 0);
    }, 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      pendingCount: pendingExpenses.length,
      totalPendingUSD,
      reminders: pendingExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        frequency: e.frequency,
        category: e.category.name,
        userEmail: e.user?.email,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error generating reminders",
      },
      { status: 500 }
    );
  }
}
