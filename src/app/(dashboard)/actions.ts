"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getUserId() {
  try {
    // En Next.js 15+ cookies() es asíncrono. Esto evita el bug de getServerSession que retorna null.
    const cookieStore = await cookies();
    const token = cookieStore.get("next-auth.session-token")?.value || 
                  cookieStore.get("__Secure-next-auth.session-token")?.value;

    if (!token) return null;

    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET as string,
    });

    return (decoded?.sub || decoded?.id) as string | undefined;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

/**
 * Get the latest exchange rate from the database.
 * Falls back to a default rate if none is found.
 */
export async function getLatestExchangeRate(): Promise<number> {
  try {
    const response = await fetch("https://ve.dolarapi.com/v1/dolares", {
      next: { revalidate: 300 },
    });
    if (response.ok) {
      const data = await response.json();
      const oficialRate = data.find((d: any) => d.fuente === "oficial")?.promedio;
      if (oficialRate && typeof oficialRate === "number" && oficialRate > 0) {
        return oficialRate;
      }
    }
  } catch (error) {
    console.error("Error fetching live rate in getLatestExchangeRate:", error);
  }

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
 * Includes total spent in both currencies, transaction count, and category breakdown.
 */
export async function getMonthSummary() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const userId = await getUserId();
    
    if (!userId) {
      throw new Error("No autorizado. Token inválido o expirado.");
    }

    const expenses = await prisma.expense.findMany({
      where: {
        userId: userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        category: true,
      },
    });

    const currentRate = await getLatestExchangeRate();

    let totalVES = 0;
    let totalUSD = 0;
    const categoryBreakdown: Record<string, { name: string, ves: number, usd: number, color: string }> = {};

    for (const expense of expenses) {
      const amountVES = expense.currency === "VES" ? expense.amount : expense.amount * currentRate;
      const amountUSD = expense.currency === "USD" ? expense.amount : expense.amount / currentRate;

      totalVES += amountVES;
      totalUSD += amountUSD;

      if (!categoryBreakdown[expense.categoryId]) {
        categoryBreakdown[expense.categoryId] = {
          name: expense.category.name,
          ves: 0,
          usd: 0,
          color: expense.category.color || "#8b5cf6",
        };
      }
      categoryBreakdown[expense.categoryId].ves += amountVES;
      categoryBreakdown[expense.categoryId].usd += amountUSD;
    }

    const totalIncomeUSD = await getTotalIncomeUSD();
    const totalIncomeVES = totalIncomeUSD * currentRate;

    return {
      totalSpentVES: totalVES,
      totalSpentUSD: totalUSD,
      balanceVES: totalIncomeVES - totalVES,
      balanceUSD: totalIncomeUSD - totalUSD,
      transactionCount: expenses.length,
      categories: Object.values(categoryBreakdown),
      currentRate,
      totalIncomeVES,
      totalIncomeUSD,
    };
  } catch (error) {
    console.error("Error in getMonthSummary:", error);
    return {
      totalSpentVES: 0,
      totalSpentUSD: 0,
      balanceVES: 0,
      balanceUSD: 0,
      transactionCount: 0,
      categories: [],
      currentRate: 1420.0,
      totalIncomeVES: 0,
      totalIncomeUSD: 0,
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

    const userId = await getUserId();
    
    if (!userId) {
      throw new Error("No autorizado");
    }

    const expenses = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        userId: userId,
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
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error("No autorizado");
    }

    const expenses = await prisma.expense.findMany({
      where: {
        userId: userId,
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
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error("No autorizado");
    }

    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get budgets for the current month
    const budgets = await prisma.budget.findMany({
      where: {
        userId: userId,
        month: monthStr,
      },
      include: {
        category: true,
      },
    });

    // Get expenses for the current month
    const expenses = await prisma.expense.findMany({
      where: {
        userId: userId,
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
          spentUSD += expense.amount / currentRate;
        } else {
          spentUSD += expense.amount;
          spentVES += expense.amount * currentRate;
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
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error("No autorizado");
    }

    const expenses = await prisma.expense.findMany({
      where: { userId: userId },
      include: { category: true }
    });

    const categoryData: Record<string, { name: string, value: number, fill: string }> = {};
    let totalVES = 0;
    let totalUSD = 0;
    let countVES = 0;
    let countUSD = 0;

    const currentRate = await getLatestExchangeRate();

    expenses.forEach(e => {
      const amountUSD = e.currency === "USD" ? e.amount : e.amount / currentRate;
      
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
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error("No autorizado");
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: userId,
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

/**
 * Register a new user.
 */
export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Email y contraseña son requeridos" };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return { error: "El correo ya está registrado" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "user"
      }
    });

    return { success: true };
  } catch (error) {
    return { error: "Error al registrar el usuario" };
  }
}

/**
 * Get all categories from the database.
 */
export async function getCategories() {
  try {
    let categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    if (categories.length === 0) {
      const defaultCategories = [
        { name: "Alimentación", icon: "🍔", color: "#f59e0b" },
        { name: "Transporte", icon: "🚗", color: "#3b82f6" },
        { name: "Vivienda", icon: "🏠", color: "#8b5cf6" },
        { name: "Salud", icon: "💊", color: "#ef4444" },
        { name: "Educación", icon: "📚", color: "#06b6d4" },
        { name: "Entretenimiento", icon: "🎬", color: "#ec4899" },
        { name: "Servicios", icon: "💡", color: "#f97316" },
        { name: "Ropa", icon: "👕", color: "#14b8a6" },
        { name: "Tecnología", icon: "💻", color: "#6366f1" },
        { name: "Iglesia", icon: "⛪", color: "#10b981" },
        { name: "Otros", icon: "📦", color: "#6b7280" },
      ];
      
      // Dynamic seeding if connected but empty
      await prisma.category.createMany({
        data: defaultCategories,
        skipDuplicates: true,
      });

      categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
      });
    }
    return categories;
  } catch (error) {
    console.error("Error fetching or seeding categories:", error);
    // Fallback list of categories if DB is not connected
    return [
      { id: "1", name: "Alimentación", icon: "🍔", color: "#f59e0b" },
      { id: "2", name: "Transporte", icon: "🚗", color: "#3b82f6" },
      { id: "3", name: "Vivienda", icon: "🏠", color: "#8b5cf6" },
      { id: "4", name: "Salud", icon: "💊", color: "#ef4444" },
      { id: "5", name: "Educación", icon: "📚", color: "#06b6d4" },
      { id: "6", name: "Entretenimiento", icon: "🎬", color: "#ec4899" },
      { id: "7", name: "Servicios", icon: "💡", color: "#f97316" },
      { id: "8", name: "Ropa", icon: "👕", color: "#14b8a6" },
      { id: "9", name: "Tecnología", icon: "💻", color: "#6366f1" },
      { id: "10", name: "Iglesia", icon: "⛪", color: "#10b981" },
      { id: "11", name: "Otros", icon: "📦", color: "#6b7280" },
    ];
  }
}

/**
 * Server Action to create a new expense.
 */
export async function createExpenseAction(data: {
  description: string;
  amount: number;
  currency: string;
  categoryId: string;
  date?: string;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }

    const { description, amount, currency, categoryId, date } = data;
    if (!description || !amount || !currency || !categoryId) {
      return { error: "Campos obligatorios faltantes" };
    }

    const exchangeRate = await getLatestExchangeRate();

    // Calculate equivalent amount
    let equivalentAmount: number;
    if (currency === "VES") {
      equivalentAmount = amount / exchangeRate;
    } else {
      equivalentAmount = amount * exchangeRate;
    }

    // Attempt to save to database
    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        currency,
        exchangeRate,
        equivalentAmount,
        categoryId,
        userId,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/expenses");
    revalidatePath("/incomes");

    return { success: true, expense };
  } catch (error: any) {
    console.error("Error creating expense:", error);
    
    // Fallback mock expense for demo environment
    const randomId = Math.random().toString(36).substring(2, 9);
    const dbCategories = [
      { id: "1", name: "Alimentación", icon: "🍔", color: "#f59e0b" },
      { id: "2", name: "Transporte", icon: "🚗", color: "#3b82f6" },
      { id: "3", name: "Vivienda", icon: "🏠", color: "#8b5cf6" },
      { id: "4", name: "Salud", icon: "💊", color: "#ef4444" },
      { id: "5", name: "Educación", icon: "📚", color: "#06b6d4" },
      { id: "6", name: "Entretenimiento", icon: "🎬", color: "#ec4899" },
      { id: "7", name: "Servicios", icon: "💡", color: "#f97316" },
      { id: "8", name: "Ropa", icon: "👕", color: "#14b8a6" },
      { id: "9", name: "Tecnología", icon: "💻", color: "#6366f1" },
      { id: "10", name: "Iglesia", icon: "⛪", color: "#10b981" },
      { id: "11", name: "Otros", icon: "📦", color: "#6b7280" },
    ];
    
    const cat = dbCategories.find(c => c.id === data.categoryId) || dbCategories[9];
    
    const mockExpense = {
      id: randomId,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      exchangeRate: 1420.0,
      equivalentAmount: data.currency === "VES" ? data.amount / 1420.0 : data.amount * 1420.0,
      source: "MANUAL",
      date: data.date ? new Date(data.date) : new Date(),
      categoryId: data.categoryId,
      category: {
        name: cat.name,
        color: cat.color,
        icon: cat.icon
      }
    };

    return { 
      success: true, 
      expense: mockExpense, 
      warning: "Se usaron datos simulados debido a problemas de conexión con la base de datos." 
    };
  }
}

/**
 * Server Action to delete an expense.
 */
export async function deleteExpenseAction(id: string) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }
    const deleteResult = await prisma.expense.deleteMany({
      where: { id, userId }
    });
    if (deleteResult.count === 0) {
      return { error: "Gasto no encontrado o no autorizado." };
    }
    revalidatePath("/");
    revalidatePath("/expenses");
    revalidatePath("/incomes");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return { success: true, warning: "Gasto borrado (modo demo/simulado si la BD falló)." };
  }
}

/**
 * Server Action to update an expense.
 */
export async function updateExpenseAction(id: string, data: {
  description: string;
  amount: number;
  currency: string;
  categoryId: string;
  date?: string;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }
    
    const exchangeRate = await getLatestExchangeRate();
    let equivalentAmount: number;
    if (data.currency === "VES") {
      equivalentAmount = data.amount / exchangeRate;
    } else {
      equivalentAmount = data.amount * exchangeRate;
    }

    const expensesToUpdate = await prisma.expense.findMany({ where: { id, userId } });
    if(expensesToUpdate.length === 0) {
        return { error: "Gasto no encontrado o no autorizado." };
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        categoryId: data.categoryId,
        exchangeRate,
        equivalentAmount,
        date: data.date ? new Date(data.date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/expenses");
    revalidatePath("/incomes");

    return { success: true, expense };
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return { 
      success: true, 
      warning: "Gasto actualizado (modo demo/simulado si la BD falló).",
      expense: {
        id,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        categoryId: data.categoryId,
        exchangeRate: 1420,
        equivalentAmount: data.currency === "VES" ? data.amount / 1420 : data.amount * 1420,
        source: "MANUAL",
        date: data.date ? new Date(data.date) : new Date(),
        category: {
          name: "Categoría Actualizada",
          color: "#8b5cf6",
          icon: ""
        }
      } 
    };
  }
}

// =============================================
// INCOME ACTIONS
// =============================================

/**
 * Get all incomes for the current user.
 */
export async function getIncomes() {
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error("No autorizado");
    }

    const incomes = await prisma.income.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    return incomes;
  } catch {
    return [];
  }
}

/**
 * Get total income for the current user, converted to USD.
 */
export async function getTotalIncomeUSD(): Promise<number> {
  try {
    const userId = await getUserId();
    if (!userId) return 0;

    const currentRate = await getLatestExchangeRate();
    const incomes = await prisma.income.findMany({
      where: { userId },
    });

    return incomes.reduce((sum, inc) => {
      return sum + (inc.currency === "USD" ? inc.amount : inc.amount / currentRate);
    }, 0);
  } catch {
    return 0;
  }
}

/**
 * Server Action to create a new income.
 */
export async function createIncomeAction(data: {
  description: string;
  amount: number;
  currency: string;
  date?: string;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }

    const { description, amount, currency, date } = data;
    if (!description || !amount || !currency) {
      return { error: "Campos obligatorios faltantes" };
    }

    const exchangeRate = await getLatestExchangeRate();

    let equivalentAmount: number;
    if (currency === "VES") {
      equivalentAmount = amount / exchangeRate;
    } else {
      equivalentAmount = amount * exchangeRate;
    }

    const income = await prisma.income.create({
      data: {
        description,
        amount,
        currency,
        exchangeRate,
        equivalentAmount,
        userId,
        date: date ? new Date(date) : new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/expenses");
    revalidatePath("/incomes");

    return { success: true, income };
  } catch (error: any) {
    console.error("Error creating income:", error);
    return { error: "Error al crear el ingreso." };
  }
}

/**
 * Server Action to update an income.
 */
export async function updateIncomeAction(id: string, data: {
  description: string;
  amount: number;
  currency: string;
  date?: string;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }

    const exchangeRate = await getLatestExchangeRate();
    let equivalentAmount: number;
    if (data.currency === "VES") {
      equivalentAmount = data.amount / exchangeRate;
    } else {
      equivalentAmount = data.amount * exchangeRate;
    }

    const existing = await prisma.income.findMany({ where: { id, userId } });
    if (existing.length === 0) {
      return { error: "Ingreso no encontrado o no autorizado." };
    }

    const income = await prisma.income.update({
      where: { id },
      data: {
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        exchangeRate,
        equivalentAmount,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/expenses");
    revalidatePath("/incomes");

    return { success: true, income };
  } catch (error: any) {
    console.error("Error updating income:", error);
    return { error: "Error al actualizar el ingreso." };
  }
}

/**
 * Server Action to delete an income.
 */
export async function deleteIncomeAction(id: string) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }
    const deleteResult = await prisma.income.deleteMany({
      where: { id, userId }
    });
    if (deleteResult.count === 0) {
      return { error: "Ingreso no encontrado o no autorizado." };
    }
    revalidatePath("/");
    revalidatePath("/expenses");
    revalidatePath("/incomes");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting income:", error);
    return { error: "Error al eliminar el ingreso." };
  }
}

// =============================================
// FIXED / RECURRING EXPENSES ACTIONS
// =============================================

/**
 * Get all fixed expenses for the current user for a given week.
 */
export async function getFixedExpensesForWeek(weekStartIso?: string) {
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error("No autorizado");
    }

    const targetDate = weekStartIso ? new Date(weekStartIso) : new Date();
    // Normalize targetDate to Monday 00:00:00 UTC/Local
    const d = new Date(targetDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [fixedExpenses, logs] = await Promise.all([
      prisma.fixedExpense.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.fixedExpenseLog.findMany({
        where: {
          userId,
          weekStart: {
            gte: new Date(weekStart.getTime() - 12 * 60 * 60 * 1000),
            lte: new Date(weekStart.getTime() + 36 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const logMap = new Map<string, boolean>();
    logs.forEach((log) => {
      logMap.set(log.fixedExpenseId, log.isPaid);
    });

    const matchingExpenses: Array<any> = [];

    for (const expense of fixedExpenses) {
      const itemType = expense.type || "RECURRING";

      if (itemType === "ONE_TIME" || itemType === "INSTALLMENT") {
        // Must have dueDate (or createdAt) inside the selected week range [weekStart, weekEnd]
        const dateToCheck = expense.dueDate
          ? new Date(expense.dueDate)
          : new Date(expense.createdAt);
        if (dateToCheck >= weekStart && dateToCheck <= weekEnd) {
          matchingExpenses.push({
            ...expense,
            type: itemType,
            dueDate: dateToCheck,
            isPaid: logMap.has(expense.id) ? logMap.get(expense.id)! : expense.isPaid,
          });
        }
      } else if (itemType === "RECURRING") {
        if (expense.frequency === "WEEKLY") {
          // Weekly recurring commitment: occurs every week on its designated weekday
          const baseDate = expense.dueDate
            ? new Date(expense.dueDate)
            : new Date(expense.createdAt);
          const targetWeekday = baseDate.getDay(); // 0 is Sunday, 1..6 is Mon..Sat
          const diffDays = targetWeekday === 0 ? 6 : targetWeekday - 1; // Monday = 0 diff
          const calculatedDueDate = new Date(weekStart);
          calculatedDueDate.setDate(weekStart.getDate() + diffDays);
          calculatedDueDate.setHours(12, 0, 0, 0);

          matchingExpenses.push({
            ...expense,
            type: "RECURRING",
            dueDate: calculatedDueDate,
            isPaid: logMap.has(expense.id) ? logMap.get(expense.id)! : expense.isPaid,
          });
        } else if (expense.frequency === "MONTHLY") {
          // Monthly recurring commitment: only occurs once a month on its cut-off day
          const baseDate = expense.dueDate
            ? new Date(expense.dueDate)
            : new Date(expense.createdAt);
          const dayOfMonth = baseDate.getDate();

          // Check if dayOfMonth occurs within [weekStart, weekEnd]
          const month1 = { year: weekStart.getFullYear(), month: weekStart.getMonth() };
          const month2 = { year: weekEnd.getFullYear(), month: weekEnd.getMonth() };

          const monthsToCheck = [month1];
          if (month1.year !== month2.year || month1.month !== month2.month) {
            monthsToCheck.push(month2);
          }

          let matchedDate: Date | null = null;
          for (const m of monthsToCheck) {
            const maxDays = new Date(m.year, m.month + 1, 0).getDate();
            const targetDay = Math.min(dayOfMonth, maxDays);
            const candidateDate = new Date(m.year, m.month, targetDay, 12, 0, 0);

            if (candidateDate >= weekStart && candidateDate <= weekEnd) {
              matchedDate = candidateDate;
              break;
            }
          }

          if (matchedDate) {
            matchingExpenses.push({
              ...expense,
              type: "RECURRING",
              dueDate: matchedDate,
              isPaid: logMap.has(expense.id) ? logMap.get(expense.id)! : expense.isPaid,
            });
          }
        } else {
          // Default recurring fallback
          matchingExpenses.push({
            ...expense,
            type: "RECURRING",
            isPaid: logMap.has(expense.id) ? logMap.get(expense.id)! : expense.isPaid,
          });
        }
      }
    }

    return matchingExpenses;
  } catch (error) {
    console.error("Error fetching fixed expenses for week:", error);
    return [];
  }
}

/**
 * Get all fixed expenses for a given month, including payment logs.
 */
export async function getFixedExpensesForMonth(monthStartIso?: string) {
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error("No autorizado");
    }

    const targetDate = monthStartIso ? new Date(monthStartIso) : new Date();
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    const [fixedExpenses, logs] = await Promise.all([
      prisma.fixedExpense.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.fixedExpenseLog.findMany({
        where: {
          userId,
          weekStart: {
            gte: new Date(monthStart.getTime() - 7 * 24 * 60 * 60 * 1000),
            lte: new Date(monthEnd.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const logMap = new Map<string, boolean>();
    logs.forEach((log) => {
      const key = `${log.fixedExpenseId}_${new Date(log.weekStart).toISOString().split("T")[0]}`;
      logMap.set(key, log.isPaid);
      logMap.set(log.fixedExpenseId, log.isPaid);
    });

    const filteredExpenses = fixedExpenses.filter((expense) => {
      const itemType = expense.type || "RECURRING";
      if (itemType === "ONE_TIME" || itemType === "INSTALLMENT") {
        const dateToCheck = expense.dueDate
          ? new Date(expense.dueDate)
          : new Date(expense.createdAt);
        return dateToCheck >= monthStart && dateToCheck <= monthEnd;
      }
      return true;
    });

    return filteredExpenses.map((expense) => ({
      ...expense,
      type: expense.type || "RECURRING",
      isPaid: logMap.has(expense.id) ? logMap.get(expense.id)! : expense.isPaid,
    }));
  } catch (error) {
    console.error("Error fetching fixed expenses for month:", error);
    return getFixedExpensesForWeek();
  }
}

/**
 * Summary of weekly income data including projected monthly income.
 */
export interface WeeklyIncomeSummary {
  weeklyIncomeUSD: number;
  monthlyProjectedIncomeUSD: number;
  totalIncomeUSD: number;
  actualIncomeUSD: number;
  isEstimated: boolean;
  incomesCount: number;
}

/**
 * Get comprehensive income sum and breakdown for a given week range (and monthly projection).
 */
export async function getWeeklyIncomeData(weekStartIso?: string): Promise<WeeklyIncomeSummary> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return {
        weeklyIncomeUSD: 0,
        monthlyProjectedIncomeUSD: 0,
        totalIncomeUSD: 0,
        actualIncomeUSD: 0,
        isEstimated: false,
        incomesCount: 0,
      };
    }

    const currentRate = await getLatestExchangeRate();

    const targetDate = weekStartIso ? new Date(weekStartIso) : new Date();
    const d = new Date(targetDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // 1. Get incomes registered specifically in this week interval [weekStart, weekEnd]
    const weeklyIncomes = await prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: { date: "desc" },
    });

    const actualIncomeUSD = weeklyIncomes.reduce((sum, inc) => {
      return sum + (inc.currency === "USD" ? inc.amount : inc.amount / currentRate);
    }, 0);

    // 2. Incomes in current month [monthStart, monthEnd]
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyIncomes = await prisma.income.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const actualMonthUSD = monthlyIncomes.reduce((sum, inc) => {
      return sum + (inc.currency === "USD" ? inc.amount : inc.amount / currentRate);
    }, 0);

    // 3. Determine base weekly income
    let calculatedWeeklyUSD = 0;
    let isEstimated = false;

    if (weeklyIncomes.length > 0) {
      // User has income registered in this active week
      calculatedWeeklyUSD = actualIncomeUSD;
      isEstimated = false;
    } else {
      // Fallback: take user's latest recorded weekly salary / income directly without dividing by 4
      const latestIncomes = await prisma.income.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
      });

      if (latestIncomes.length > 0) {
        const latestUSD = latestIncomes[0].currency === "USD"
          ? latestIncomes[0].amount
          : latestIncomes[0].amount / currentRate;
        calculatedWeeklyUSD = latestUSD;
        isEstimated = true;
      }
    }

    // 4. Monthly projected income: Weekly salary × 4 (or actual month total if higher)
    const monthlyProjectedUSD = Math.max(actualMonthUSD, calculatedWeeklyUSD * 4);

    return {
      weeklyIncomeUSD: calculatedWeeklyUSD,
      monthlyProjectedIncomeUSD: monthlyProjectedUSD,
      totalIncomeUSD: calculatedWeeklyUSD,
      actualIncomeUSD,
      isEstimated,
      incomesCount: weeklyIncomes.length,
    };
  } catch (error) {
    console.error("Error fetching weekly income data:", error);
    return {
      weeklyIncomeUSD: 0,
      monthlyProjectedIncomeUSD: 0,
      totalIncomeUSD: 0,
      actualIncomeUSD: 0,
      isEstimated: false,
      incomesCount: 0,
    };
  }
}

/**
 * Get income sum for a given week range (or weekly estimate).
 */
export async function getWeeklyIncomeUSD(weekStartIso?: string): Promise<number> {
  const data = await getWeeklyIncomeData(weekStartIso);
  return data.weeklyIncomeUSD;
}

/**
 * Create multiple installment fixed expense records (e.g. Cashea).
 */
export async function createInstallmentExpense(data: {
  description: string;
  totalAmount: number;
  currency: string;
  categoryId: string;
  startDate: string;
  installmentFrequency: "BIWEEKLY" | "MONTHLY";
  totalInstallments: number;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }

    const {
      description,
      totalAmount,
      currency,
      categoryId,
      startDate,
      installmentFrequency,
      totalInstallments,
    } = data;

    if (!description || !totalAmount || totalAmount <= 0 || !totalInstallments || totalInstallments <= 0) {
      return { error: "Datos de cuotas inválidos" };
    }

    const installmentAmount = totalAmount / totalInstallments;
    const baseDate = new Date(startDate);

    const createdRecords = [];
    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(baseDate);
      if (installmentFrequency === "BIWEEKLY") {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 14);
      } else {
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
      }

      const installmentDescription = `${description} (Cuota ${i}/${totalInstallments})`;

      const record = await prisma.fixedExpense.create({
        data: {
          description: installmentDescription,
          amount: installmentAmount,
          currency,
          frequency: "WEEKLY",
          type: "ONE_TIME",
          categoryId,
          userId,
          isPaid: false,
          dueDate,
        },
        include: { category: true },
      });
      createdRecords.push(record);
    }

    revalidatePath("/budgets");
    return { success: true, count: createdRecords.length, records: createdRecords };
  } catch (error: any) {
    console.error("Error creating installment expense:", error);
    return { error: "Error al generar las cuotas." };
  }
}

/**
 * Get all fixed expenses for the current user (defaults to current week).
 */
export async function getFixedExpenses() {
  return getFixedExpensesForWeek();
}

/**
 * Create a new fixed expense.
 */
export async function createFixedExpense(data: {
  description: string;
  amount: number;
  currency: string;
  frequency: string;
  categoryId: string;
  type?: string;
  dueDate?: string;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }

    const { description, amount, currency, frequency, categoryId, type, dueDate } = data;
    if (!description || !amount || !currency || !frequency || !categoryId) {
      return { error: "Campos obligatorios faltantes" };
    }

    const fixedExpense = await prisma.fixedExpense.create({
      data: {
        description,
        amount,
        currency,
        frequency,
        categoryId,
        userId,
        type: type || "RECURRING",
        isPaid: false,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        category: true,
      },
    });

    revalidatePath("/budgets");
    return { success: true, fixedExpense };
  } catch (error: any) {
    console.error("Error creating fixed expense:", error);

    // Fallback for demo mode
    const dbCategories = [
      { id: "1", name: "Alimentación", icon: "🍔", color: "#f59e0b" },
      { id: "2", name: "Transporte", icon: "🚗", color: "#3b82f6" },
      { id: "3", name: "Vivienda", icon: "🏠", color: "#8b5cf6" },
      { id: "4", name: "Salud", icon: "💊", color: "#ef4444" },
      { id: "5", name: "Educación", icon: "📚", color: "#06b6d4" },
      { id: "6", name: "Entretenimiento", icon: "🎬", color: "#ec4899" },
      { id: "7", name: "Servicios", icon: "💡", color: "#f97316" },
      { id: "8", name: "Ropa", icon: "👕", color: "#14b8a6" },
      { id: "9", name: "Tecnología", icon: "💻", color: "#6366f1" },
      { id: "10", name: "Iglesia", icon: "⛪", color: "#10b981" },
      { id: "11", name: "Otros", icon: "📦", color: "#6b7280" },
    ];
    const matchedCat = dbCategories.find(c => c.id === data.categoryId) || dbCategories[10];

    const mockFixed = {
      id: Math.random().toString(36).substring(2, 9),
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      frequency: data.frequency,
      type: data.type || "RECURRING",
      isPaid: false,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      categoryId: data.categoryId,
      category: { name: matchedCat.name, icon: matchedCat.icon, color: matchedCat.color },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      fixedExpense: mockFixed,
      warning: "Se guardó en modo simulado debido a problemas con la base de datos.",
    };
  }
}

/**
 * Toggle paid status for a fixed expense for a specific week.
 */
export async function togglePaidStatusForWeek(id: string, isPaid: boolean, weekStartIso?: string) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }

    if (weekStartIso) {
      const targetDate = new Date(weekStartIso);
      const d = new Date(targetDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);

      await prisma.fixedExpenseLog.upsert({
        where: {
          fixedExpenseId_weekStart: {
            fixedExpenseId: id,
            weekStart,
          },
        },
        create: {
          fixedExpenseId: id,
          weekStart,
          isPaid,
          paidAt: isPaid ? new Date() : null,
          userId,
        },
        update: {
          isPaid,
          paidAt: isPaid ? new Date() : null,
        },
      });
    }

    await prisma.fixedExpense.updateMany({
      where: { id, userId },
      data: { isPaid },
    });

    revalidatePath("/budgets");
    return { success: true };
  } catch (error: any) {
    console.error("Error toggling paid status for week:", error);
    return { success: true, warning: "Estado cambiado (modo demo)." };
  }
}

/**
 * Legacy toggle paid status alias.
 */
export async function togglePaidStatus(id: string, isPaid: boolean) {
  return togglePaidStatusForWeek(id, isPaid);
}

/**
 * Delete a fixed expense.
 */
export async function deleteFixedExpense(id: string) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }

    const deleted = await prisma.fixedExpense.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return { error: "Compromiso no encontrado o no autorizado." };
    }

    revalidatePath("/budgets");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting fixed expense:", error);
    return { success: true, warning: "Compromiso eliminado (modo demo)." };
  }
}

/**
 * Update an existing fixed expense.
 */
export async function updateFixedExpense(
  id: string,
  data: {
    description: string;
    amount: number;
    currency: string;
    frequency: string;
    categoryId: string;
    type?: string;
    dueDate?: string;
  }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { error: "No autorizado. Inicie sesión." };
    }

    const { description, amount, currency, frequency, categoryId, type, dueDate } = data;
    if (!description || !amount || !currency || !frequency || !categoryId) {
      return { error: "Campos obligatorios faltantes" };
    }

    const existing = await prisma.fixedExpense.findMany({ where: { id, userId } });
    if (existing.length === 0) {
      return { error: "Compromiso no encontrado o no autorizado." };
    }

    const fixedExpense = await prisma.fixedExpense.update({
      where: { id },
      data: {
        description,
        amount,
        currency,
        frequency,
        categoryId,
        type: type || "RECURRING",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        category: true,
      },
    });

    revalidatePath("/budgets");
    return { success: true, fixedExpense };
  } catch (error: any) {
    console.error("Error updating fixed expense:", error);

    const dbCategories = [
      { id: "1", name: "Alimentación", icon: "🍔", color: "#f59e0b" },
      { id: "2", name: "Transporte", icon: "🚗", color: "#3b82f6" },
      { id: "3", name: "Vivienda", icon: "🏠", color: "#8b5cf6" },
      { id: "4", name: "Salud", icon: "💊", color: "#ef4444" },
      { id: "5", name: "Educación", icon: "📚", color: "#06b6d4" },
      { id: "6", name: "Entretenimiento", icon: "🎬", color: "#ec4899" },
      { id: "7", name: "Servicios", icon: "💡", color: "#f97316" },
      { id: "8", name: "Ropa", icon: "👕", color: "#14b8a6" },
      { id: "9", name: "Tecnología", icon: "💻", color: "#6366f1" },
      { id: "10", name: "Iglesia", icon: "⛪", color: "#10b981" },
      { id: "11", name: "Otros", icon: "📦", color: "#6b7280" },
    ];
    const matchedCat = dbCategories.find(c => c.id === data.categoryId) || dbCategories[10];

    const mockUpdated = {
      id,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      frequency: data.frequency,
      type: data.type || "RECURRING",
      isPaid: false,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      categoryId: data.categoryId,
      category: { name: matchedCat.name, icon: matchedCat.icon, color: matchedCat.color },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      fixedExpense: mockUpdated,
      warning: "Compromiso actualizado en modo simulado.",
    };
  }
}

/**
 * Get pending fixed expenses (isPaid: false) for the current user.
 */
export async function getPendingFixedExpenses() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return [];
    }

    const pendingExpenses = await prisma.fixedExpense.findMany({
      where: {
        userId,
        isPaid: false,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return pendingExpenses;
  } catch (error) {
    console.error("Error fetching pending fixed expenses:", error);
    return [
      {
        id: "fe2",
        description: "Internet Inter",
        amount: 35.0,
        currency: "USD",
        frequency: "MONTHLY",
        isPaid: false,
        categoryId: "7",
        category: { name: "Servicios", icon: "💡", color: "#f97316" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "fe3",
        description: "Condominio",
        amount: 45.0,
        currency: "USD",
        frequency: "MONTHLY",
        isPaid: false,
        categoryId: "3",
        category: { name: "Vivienda", icon: "🏠", color: "#8b5cf6" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
}



