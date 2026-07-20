import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestExchangeRate } from "@/app/(dashboard)/actions";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, amount, currency, email, date } = body;

    // Validate required fields
    if (!description || typeof amount !== "number" || !currency || !email) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: description, amount, currency, email" },
        { status: 400 }
      );
    }

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: `Usuario con email ${email} no encontrado` },
        { status: 404 }
      );
    }

    // Get default category "Otros" or the first category available
    let category = await prisma.category.findFirst({
      where: {
        name: {
          equals: "Otros",
          mode: "insensitive",
        },
      },
    });

    if (!category) {
      category = await prisma.category.findFirst();
    }

    if (!category) {
      return NextResponse.json(
        { error: "No se encontró ninguna categoría configurada en el sistema. Ejecute el seeding." },
        { status: 500 }
      );
    }

    // Fetch live BCV exchange rate
    const exchangeRate = await getLatestExchangeRate();

    // Calculate equivalent amount
    let equivalentAmount: number;
    if (currency === "VES") {
      equivalentAmount = amount / exchangeRate;
    } else {
      equivalentAmount = amount * exchangeRate;
    }

    // Save automatic expense to database
    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        currency,
        exchangeRate,
        equivalentAmount,
        source: "AUTOMATIC",
        categoryId: category.id,
        userId: user.id,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        category: true,
      },
    });

    // Revalidate affected paths
    revalidatePath("/");
    revalidatePath("/expenses");
    revalidatePath("/incomes");

    return NextResponse.json(
      { success: true, expense },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en webhook de gastos por correo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
