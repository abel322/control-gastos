import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestExchangeRate } from "@/app/(dashboard)/actions";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

export const dynamic = "force-dynamic";

interface ParsedTransaction {
  date: Date;
  reference: string;
  description: string;
  amount: number;
  isExpense: boolean;
}

// Helper to convert Venezuelan amount string "1.500,00" or "500,00" or "-500,00" to float
function parseMercantilAmount(str: string): { amount: number; isNegative: boolean } | null {
  if (!str) return null;
  let clean = str.trim();
  const isNegative = clean.startsWith("-") || clean.endsWith("-") || clean.startsWith("(");

  clean = clean.replace(/[-\+\(\)\s]/g, "");
  if (!clean) return null;

  // Format "1.500,00" -> "1500.00"
  if (clean.includes(".") && clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(",")) {
    clean = clean.replace(",", ".");
  } else if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts[1] && parts[1].length === 3) {
      clean = clean.replace(".", "");
    }
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  return { amount: Math.abs(num), isNegative };
}

// Helper to parse date string (DD/MM/YYYY or DD/MM/YY)
function parseMercantilDate(dateStr: string): Date {
  const parts = dateStr.split(/[\/\.-]/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  return new Date();
}

// Parser for Mercantil PDF extracted text
function parseMercantilPdfText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\r?\n/);

  const dateRegex = /\b(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})\b/;
  const refRegex = /\b(\d{8,16})\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes("saldo final") ||
      lowerLine.includes("saldo inicial") ||
      lowerLine.includes("encabezado") ||
      lowerLine.includes("estado de cuenta") ||
      lowerLine.includes("pagina") ||
      lowerLine.includes("página")
    ) {
      continue;
    }

    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const date = parseMercantilDate(dateStr);

    const lineWithoutDate = line.replace(dateStr, "").trim();
    const refMatch = lineWithoutDate.match(refRegex);

    let reference = "000000000000";
    let remaining = lineWithoutDate;

    if (refMatch) {
      reference = refMatch[1];
      remaining = remaining.replace(reference, "").trim();
    }

    const amountMatches = remaining.match(/([+-]?\d{1,3}(?:\.\d{3})*,\d{2}|[+-]?\d+,\d{2})/g);
    if (!amountMatches || amountMatches.length === 0) continue;

    const mainAmountStr = amountMatches.length > 1 ? amountMatches[amountMatches.length - 2] : amountMatches[0];
    const parsedAmt = parseMercantilAmount(mainAmountStr);
    if (!parsedAmt || parsedAmt.amount === 0) continue;

    let description = remaining;
    for (const amtStr of amountMatches) {
      description = description.replace(amtStr, "");
    }
    description = description.replace(/[^\w\s\.\-]/gi, " ").replace(/\s+/g, " ").trim();

    if (!description || description.length < 2) {
      description = "Movimiento Mercantil";
    }

    let isExpense = parsedAmt.isNegative;
    if (!isExpense) {
      const descLower = description.toLowerCase() + " " + line.toLowerCase();
      if (
        descLower.includes("pago") ||
        descLower.includes("comision") ||
        descLower.includes("comisión") ||
        descLower.includes("debito") ||
        descLower.includes("débito") ||
        descLower.includes("compra") ||
        descLower.includes("retiro") ||
        descLower.includes("igtf") ||
        descLower.includes("cargo") ||
        descLower.includes("tpago enviado") ||
        descLower.includes("transferencia enviada") ||
        descLower.includes(" egreso") ||
        descLower.includes(" d ") ||
        descLower.endsWith(" d")
      ) {
        isExpense = true;
      } else if (
        descLower.includes("abono") ||
        descLower.includes("recibido") ||
        descLower.includes("deposito") ||
        descLower.includes("depósito") ||
        descLower.includes("credito") ||
        descLower.includes("crédito") ||
        descLower.includes(" c ") ||
        descLower.endsWith(" c")
      ) {
        isExpense = false;
      } else {
        isExpense = true;
      }
    }

    transactions.push({
      date,
      reference,
      description,
      amount: parsedAmt.amount,
      isExpense,
    });
  }

  return transactions;
}

// Parser for Mercantil CSV text
function parseMercantilCsvText(csvText: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = csvText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const delimiter = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
    const parts = line.split(delimiter).map((p) => p.replace(/^"|"$/g, "").trim());

    if (parts.length < 3) continue;

    const firstPartLower = parts[0].toLowerCase();
    if (
      firstPartLower.includes("fecha") ||
      firstPartLower.includes("saldo") ||
      firstPartLower.includes("encabezado")
    ) {
      continue;
    }

    let dateStr = "";
    let reference = "000000000000";
    let description = "";
    let amountStr = "";
    let typeIndicator = "";

    for (const part of parts) {
      if (!dateStr && /\b\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4}\b/.test(part)) {
        dateStr = part;
      } else if (reference === "000000000000" && /^\d{8,16}$/.test(part)) {
        reference = part;
      } else if (!amountStr && /^[+-]?\d{1,3}(?:\.\d{3})*,\d{2}$|^[+-]?\d+,\d{2}$/.test(part)) {
        amountStr = part;
      } else if (part.length === 1 && (part.toUpperCase() === "D" || part.toUpperCase() === "C")) {
        typeIndicator = part.toUpperCase();
      } else if (part.length > 2 && !description) {
        description = part;
      }
    }

    if (!dateStr || !amountStr) continue;

    const date = parseMercantilDate(dateStr);
    const parsedAmt = parseMercantilAmount(amountStr);
    if (!parsedAmt || parsedAmt.amount === 0) continue;

    if (!description) description = "Movimiento Mercantil";

    let isExpense = parsedAmt.isNegative || typeIndicator === "D";
    if (!isExpense && typeIndicator !== "C") {
      const descLower = description.toLowerCase() + " " + line.toLowerCase();
      if (
        descLower.includes("pago") ||
        descLower.includes("comision") ||
        descLower.includes("debito") ||
        descLower.includes("compra") ||
        descLower.includes("retiro") ||
        descLower.includes("igtf") ||
        descLower.includes("cargo")
      ) {
        isExpense = true;
      }
    }

    transactions.push({
      date,
      reference,
      description,
      amount: parsedAmt.amount,
      isExpense,
    });
  }

  return transactions;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("next-auth.session-token")?.value ||
      cookieStore.get("__Secure-next-auth.session-token")?.value;

    let userId: string | undefined;
    if (token) {
      const decoded = await decode({
        token,
        secret: process.env.NEXTAUTH_SECRET as string,
      });
      userId = (decoded?.sub || decoded?.id) as string | undefined;
    }

    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo para procesar." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedTransactions: ParsedTransaction[] = [];

    if (fileName.endsWith(".pdf")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(buffer);
      parsedTransactions = parseMercantilPdfText(pdfData.text || "");
    } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      parsedTransactions = parseMercantilCsvText(text);
    } else {
      return NextResponse.json(
        { error: "Formato no soportado. Por favor sube un archivo PDF o CSV." },
        { status: 400 }
      );
    }

    if (parsedTransactions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se pudieron extraer transacciones del archivo. Verifica que sea un Estado de Cuenta Mercantil válido.",
        },
        { status: 422 }
      );
    }

    const exchangeRate = await getLatestExchangeRate();

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

    let importedCount = 0;
    let existingCount = 0;
    let ignoredCount = 0;

    for (const tx of parsedTransactions) {
      if (
        !tx.reference ||
        tx.reference === "0000000000000000" ||
        tx.reference === "000000000000" ||
        /^0+$/.test(tx.reference) ||
        !tx.amount
      ) {
        ignoredCount++;
        continue;
      }

      const exists = await prisma.expense.findFirst({
        where: {
          reference: tx.reference,
          userId: user.id,
        },
      });

      if (!exists && tx.isExpense) {
        const equivalentAmount =
          exchangeRate > 0 ? tx.amount / exchangeRate : tx.amount;

        await prisma.expense.create({
          data: {
            amount: tx.amount,
            description: `${tx.description} (Mercantil)`,
            reference: tx.reference,
            date: tx.date,
            currency: "VES",
            exchangeRate,
            equivalentAmount,
            categoryId: category.id,
            source: "ESTADO_CUENTA_PDF",
            userId: user.id,
          },
        });
        importedCount++;
      } else if (exists) {
        existingCount++;
      } else {
        ignoredCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importación exitosa: ${importedCount} gastos nuevos agregados, ${existingCount} ya existían.`,
      importedCount,
      existingCount,
      ignoredCount,
      totalParsed: parsedTransactions.length,
    });
  } catch (error: any) {
    console.error("Error al importar estado de cuenta:", error);
    return NextResponse.json(
      {
        error: "Ocurrió un error al procesar el archivo del estado de cuenta.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
