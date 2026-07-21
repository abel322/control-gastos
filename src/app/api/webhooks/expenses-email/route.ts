import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestExchangeRate } from "@/app/(dashboard)/actions";

// Helpers to extract information from email
function parseAmount(text: string): number | null {
  // Typical Venezuelan amounts look like: Bs. 1.250,00 or Bs. 450,50 or Bs 1200
  const amountRegexes = [
    /(?:Bs\.?|VES|Bs\.S)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i, // Format: 1.250,00 or Bs.1.250,00
    /monto:?\s*(?:Bs\.?|VES|Bs\.S)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i, // Format: Monto: Bs. 1.250,00
    /debito por\s*(?:Bs\.?|VES|Bs\.S)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i,
    /compra de\s*(?:Bs\.?|VES|Bs\.S)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanVal = match[1].replace(/\./g, "").replace(",", ".");
      const parsed = parseFloat(cleanVal);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  // Fallback regex for simpler numeric formats (e.g. 1500.50 or 1500)
  const simpleRegex = /(?:Bs\.?|VES|Bs\.S)\s*(\d+(?:\.\d+)?)/i;
  const simpleMatch = text.match(simpleRegex);
  if (simpleMatch && simpleMatch[1]) {
    const parsed = parseFloat(simpleMatch[1]);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function parseMerchant(text: string, subject: string): string {
  // First, extract the amount so we can clean it from the text
  const amountRegex = /(?:Bs\.?|VES|Bs\.S)?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi;
  let cleanedText = text.replace(amountRegex, "");

  // Now search for the merchant name using keyword patterns
  const merchantRegexes = [
    /(?:a favor de|en favor de)\s+([A-Z0-9\s#\-]{3,30})/i,
    /(?:realizado en|compra en|consumo en|debito en|establecido en)\s+([A-Z0-9\s#\-]{3,30})/i,
    /(?:comercio|destinatario|destino)\s+([A-Z0-9\s#\-]{3,30})/i,
    /(?:pago movil a)\s+([A-Z0-9\s#\-]{3,30})/i,
    /(?:transferencia a)\s+([A-Z0-9\s#\-]{3,30})/i,
    /\b(?:en|a)\s+([A-Z0-9\s#\-]{3,30})/i,
  ];

  for (const regex of merchantRegexes) {
    const match = cleanedText.match(regex);
    if (match && match[1]) {
      let name = match[1].trim();
      
      // Clean up common trailing words like "el", "la", "del", or dates/times
      name = name.replace(/\s+(el|la|del|de|fecha|con|por|desde)\b.*/i, "");
      name = name.trim();

      // Avoid generic matches
      if (name.toLowerCase() !== "favor de" && name.toLowerCase() !== "cuenta" && name.length >= 3) {
        return name.toUpperCase();
      }
    }
  }

  // Fallback to subject line or generic notification
  if (subject && subject.trim().length > 3) {
    return `CORREO: ${subject.trim()}`;
  }

  return "GASTO AUTOMÁTICO POR CORREO";
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paramEmail = searchParams.get("email");
    const paramUserId = searchParams.get("userId") || searchParams.get("token");

    const contentType = request.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      body = {
        from: formData.get("from") || formData.get("sender"),
        to: formData.get("to") || formData.get("recipient"),
        subject: formData.get("subject"),
        text: formData.get("body-plain") || formData.get("text"),
        html: formData.get("body-html") || formData.get("html"),
      };
    } else {
      // Fallback text parsing if raw format
      const rawText = await request.text();
      body = { text: rawText };
    }

    const emailContent = (body.text || body.html || "").toString();
    const emailSubject = (body.subject || "").toString();

    // 1. Identify User
    let senderEmail = "";
    if (body.from) {
      const match = body.from.toString().match(/<([^>]+)>/);
      senderEmail = match ? match[1] : body.from.toString().trim();
    }

    const targetEmail = paramEmail || senderEmail;

    let user = null;
    if (paramUserId) {
      user = await prisma.user.findUnique({ where: { id: paramUserId } });
    }
    if (!user && targetEmail) {
      user = await prisma.user.findUnique({ where: { email: targetEmail } });
    }

    if (!user) {
      console.warn("Webhook Expenses-Email: User not found", { paramUserId, targetEmail });
      return NextResponse.json(
        { error: "Usuario no encontrado para registrar el gasto." },
        { status: 404 }
      );
    }

    // 2. Parse Amount & Merchant
    const amount = parseAmount(emailContent);
    if (amount === null) {
      console.warn("Webhook Expenses-Email: Amount not found in email content", { emailContent });
      return NextResponse.json(
        { error: "No se pudo extraer el monto del correo." },
        { status: 400 }
      );
    }

    const merchant = parseMerchant(emailContent, emailSubject);

    // 3. Get Exchange Rate & Calculate Equivalent Amount
    const exchangeRate = await getLatestExchangeRate();
    const equivalentAmount = amount / exchangeRate; // Since bank emails are in VES

    // 4. Find Category
    let category = await prisma.category.findUnique({
      where: { name: "Otros" },
    });
    if (!category) {
      category = await prisma.category.findFirst();
    }
    if (!category) {
      category = await prisma.category.create({
        data: { name: "Otros", icon: "📦", color: "#6b7280" },
      });
    }

    // 5. Create Expense in database
    const expense = await prisma.expense.create({
      data: {
        description: merchant,
        amount,
        currency: "VES",
        exchangeRate,
        equivalentAmount,
        source: "AUTOMATIC",
        categoryId: category.id,
        userId: user.id,
        date: new Date(), // Registered at the moment of email receipt
      },
      include: {
        category: true,
      },
    });

    console.info("Webhook Expenses-Email: Expense created automatically", {
      expenseId: expense.id,
      user: user.email,
      amount: `${amount} VES`,
    });

    return NextResponse.json({
      success: true,
      message: "Gasto registrado automáticamente con éxito.",
      expense: {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        equivalentAmount: expense.equivalentAmount,
        source: expense.source,
      },
    });
  } catch (error: any) {
    console.error("Error in expenses-email webhook:", error);
    return NextResponse.json(
      { error: "Error interno del servidor.", details: error.message },
      { status: 500 }
    );
  }
}
