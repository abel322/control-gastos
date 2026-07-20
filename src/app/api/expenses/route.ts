import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestExchangeRate } from "@/app/(dashboard)/actions";
export const dynamic = 'force-dynamic';
/**
 * GET /api/expenses
 * Returns expenses for the current month.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // e.g., "2025-05"

    let startDate: Date;
    let endDate: Date;

    if (month) {
      const [year, m] = month.split("-").map(Number);
      startDate = new Date(year, m - 1, 1);
      endDate = new Date(year, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Create a new expense.
 * Body: { description, amount, currency, categoryId, userId, date? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, amount, currency, categoryId, userId, date } = body;

    // Validate required fields
    if (!description || !amount || !currency || !categoryId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get current exchange rate
    const exchangeRate = await getLatestExchangeRate();

    // Calculate equivalent amount
    let equivalentAmount: number;
    if (currency === "VES") {
      equivalentAmount = amount / exchangeRate;
    } else {
      equivalentAmount = amount * exchangeRate;
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        currency,
        exchangeRate,
        equivalentAmount,
        source: "MANUAL",
        categoryId,
        userId,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
