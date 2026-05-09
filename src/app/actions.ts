"use server";

import { prisma } from "@/lib/prisma";

/**
 * Get the latest exchange rate from the database.
 * Falls back to a default rate if none is found.
 */
export async function getLatestExchangeRate(): Promise<number> {
  try {
    const rate = await prisma.exchangeRate.findFirst({
      orderBy: { date: "desc" },
    });
    return rate?.rate ?? 1420.0;
  } catch {
    // Fallback in case DB is not connected
    return 1420.0;
  }
}

/**
 * Get a summary of expenses for the current month.
 * Includes total spent in both currencies and transaction count.
 */
export async function getMonthSummary(userId?: string) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const expenses = await prisma.expense.findMany({
      where: {
        ...(userId ? { userId } : {}),
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const currentRate = await getLatestExchangeRate();

    let totalVES = 0;
    let totalUSD = 0;

    for (const expense of expenses) {
      if (expense.currency === "VES") {
        totalVES += expense.amount;
        totalUSD += expense.amount / expense.exchangeRate;
      } else {
        totalUSD += expense.amount;
        totalVES += expense.amount * expense.exchangeRate;
      }
    }

    return {
      totalSpentVES: totalVES,
      totalSpentUSD: totalUSD,
      balanceVES: 0 - totalVES,
      balanceUSD: 0 - totalUSD,
      transactionCount: expenses.length,
      currentRate,
    };
  } catch {
    // Fallback when DB not connected
    return {
      totalSpentVES: 0,
      totalSpentUSD: 0,
      balanceVES: 0,
      balanceUSD: 0,
      transactionCount: 0,
      currentRate: 1420.0,
    };
  }
}

/**
 * Get expenses grouped by category for the current month.
 */
export async function getExpensesByCategory(userId?: string) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const expenses = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        ...(userId ? { userId } : {}),
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return expenses;
  } catch {
    return [];
  }
}

/**
 * Get all expenses with category information.
 */
export async function getExpenses(userId?: string) {
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        ...(userId ? { userId } : {}),
      },
      include: {
        category: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return expenses;
  } catch {
    // Return mock data if DB fails
    return [
      {
        id: "1",
        description: "Compra en Automercado Plaza's",
        amount: 2500.0,
        currency: "VES",
        exchangeRate: 1420.0,
        equivalentAmount: 1.76,
        date: new Date(),
        category: { name: "Alimentación", color: "#8b5cf6", icon: "Utensils" },
      },
      {
        id: "2",
        description: "Suscripción Netflix",
        amount: 15.99,
        currency: "USD",
        exchangeRate: 1420.0,
        equivalentAmount: 22705.8,
        date: new Date(Date.now() - 86400000),
        category: { name: "Entretenimiento", color: "#ef4444", icon: "Tv" },
      },
    ];
  }
}

/**
 * Get budgets and current spending per category for the current month.
 */
export async function getBudgets(userId?: string) {
  try {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get budgets for the current month
    const budgets = await prisma.budget.findMany({
      where: {
        ...(userId ? { userId } : {}),
        month: monthStr,
      },
      include: {
        category: true,
      },
    });

    // Get expenses for the current month
    const expenses = await prisma.expense.findMany({
      where: {
        ...(userId ? { userId } : {}),
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const currentRate = await getLatestExchangeRate();

    // Map spending to categories
    const budgetStatus = budgets.map((budget) => {
      const categoryExpenses = expenses.filter(e => e.categoryId === budget.categoryId);
      
      let spentVES = 0;
      let spentUSD = 0;

      for (const expense of categoryExpenses) {
        if (expense.currency === "VES") {
          spentVES += expense.amount;
          spentUSD += expense.amount / expense.exchangeRate;
        } else {
          spentUSD += expense.amount;
          spentVES += expense.amount * expense.exchangeRate;
        }
      }

      return {
        ...budget,
        spentVES,
        spentUSD,
        percentageVES: budget.amountVES > 0 ? (spentVES / budget.amountVES) * 100 : 0,
        percentageUSD: budget.amountUSD > 0 ? (spentUSD / budget.amountUSD) * 100 : 0,
      };
    });

    return budgetStatus;
  } catch {
    // Mock data for budgets
    return [
      {
        id: "b1",
        month: "2023-10",
        amountVES: 50000.0,
        amountUSD: 50.0,
        spentVES: 35000.0,
        spentUSD: 35.0,
        percentageVES: 70,
        percentageUSD: 70,
        category: { name: "Alimentación", color: "#8b5cf6", icon: "Utensils" },
      },
      {
        id: "b2",
        month: "2023-10",
        amountVES: 20000.0,
        amountUSD: 20.0,
        spentVES: 18000.0,
        spentUSD: 18.0,
        percentageVES: 90,
        percentageUSD: 90,
        category: { name: "Servicios", color: "#10b981", icon: "Zap" },
      },
      {
        id: "b3",
        month: "2023-10",
        amountVES: 15000.0,
        amountUSD: 15.0,
        spentVES: 16500.0,
        spentUSD: 16.5,
        percentageVES: 110,
        percentageUSD: 110,
        category: { name: "Ocio", color: "#ef4444", icon: "Gamepad" },
      },
    ];
  }
}

/**
 * Get detailed analytics including category distribution and currency split.
 */
export async function getAnalyticsSummary(userId?: string) {
  try {
    const expenses = await prisma.expense.findMany({
      where: { ...(userId ? { userId } : {}) },
      include: { category: true }
    });

    const categoryData: Record<string, { name: string, value: number, fill: string }> = {};
    let totalVES = 0;
    let totalUSD = 0;
    let countVES = 0;
    let countUSD = 0;

    expenses.forEach(e => {
      const amountUSD = e.currency === "USD" ? e.amount : e.amount / e.exchangeRate;
      
      // Category aggregation (in USD for comparison)
      if (!categoryData[e.categoryId]) {
        categoryData[e.categoryId] = { 
          name: e.category.name, 
          value: 0, 
          fill: e.category.color || "#8b5cf6" 
        };
      }
      categoryData[e.categoryId].value += amountUSD;

      // Currency split
      if (e.currency === "VES") {
        totalVES += e.amount;
        countVES++;
      } else {
        totalUSD += e.amount;
        countUSD++;
      }
    });

    return {
      categories: Object.values(categoryData),
      currencySplit: [
        { name: "VES", value: countVES, fill: "#8b5cf6" },
        { name: "USD", value: countUSD, fill: "#10b981" }
      ],
      totalVES,
      totalUSD
    };
  } catch {
    // Mock data for analytics
    return {
      categories: [
        { name: "Alimentación", value: 450, fill: "#8b5cf6" },
        { name: "Servicios", value: 150, fill: "#10b981" },
        { name: "Ocio", value: 100, fill: "#ef4444" },
        { name: "Transporte", value: 80, fill: "#f59e0b" }
      ],
      currencySplit: [
        { name: "VES", value: 12, fill: "#8b5cf6" },
        { name: "USD", value: 8, fill: "#10b981" }
      ],
      totalVES: 15420.50,
      totalUSD: 245.00
    };
  }
}

/**
 * Get monthly evolution for the last 6 months.
 */
export async function getMonthlyEvolution(userId?: string) {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const expenses = await prisma.expense.findMany({
      where: {
        ...(userId ? { userId } : {}),
        date: { gte: sixMonthsAgo }
      },
      orderBy: { date: "asc" }
    });

    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const evolution: Record<string, { month: string, ves: number, usd: number }> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      evolution[key] = { month: months[d.getMonth()], ves: 0, usd: 0 };
    }

    expenses.forEach(e => {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
      if (evolution[key]) {
        if (e.currency === "VES") {
          evolution[key].ves += e.amount;
        } else {
          evolution[key].usd += e.amount;
        }
      }
    });

    return Object.values(evolution);
  } catch {
    return [
      { month: "May", ves: 12000, usd: 150 },
      { month: "Jun", ves: 15000, usd: 180 },
      { month: "Jul", ves: 14000, usd: 160 },
      { month: "Ago", ves: 18000, usd: 210 },
      { month: "Sep", ves: 16000, usd: 195 },
      { month: "Oct", ves: 21000, usd: 245 }
    ];
  }
}
