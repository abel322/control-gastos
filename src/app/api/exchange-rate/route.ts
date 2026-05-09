import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/exchange-rate
 * Returns the latest BCV exchange rate.
 */
export async function GET() {
  try {
    const rate = await prisma.exchangeRate.findFirst({
      orderBy: { date: "desc" },
    });

    if (!rate) {
      return NextResponse.json(
        { rate: 1420.0, date: new Date().toISOString(), source: "default" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      rate: rate.rate,
      date: rate.date.toISOString(),
      source: "database",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exchange-rate
 * Updates the BCV exchange rate.
 * Body: { rate: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rate } = body;

    if (!rate || typeof rate !== "number" || rate <= 0) {
      return NextResponse.json(
        { error: "Invalid rate value" },
        { status: 400 }
      );
    }

    const newRate = await prisma.exchangeRate.create({
      data: { rate },
    });

    return NextResponse.json({
      rate: newRate.rate,
      date: newRate.date.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update exchange rate" },
      { status: 500 }
    );
  }
}
