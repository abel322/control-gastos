import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestExchangeRate } from "@/app/(dashboard)/actions";

// Helper to strip HTML tags and decode HTML entities into clean plain text
function stripHtml(html: string): string {
  if (!html) return "";
  let clean = html;
  // Remove script and style tags with their contents
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  // Replace block element tags and line breaks with line breaks
  clean = clean.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n");
  clean = clean.replace(/<br\s*\/?>/gi, "\n");
  // Remove all other HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  // Normalize whitespace
  clean = clean.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
  return clean;
}

// Helpers to extract information from email
function parseAmount(text: string): number | null {
  if (!text) return null;

  // Amount formats in Venezuelan bank emails:
  // "Bs. 1.234,56", "Monto: 1.234,56", "Bs.1234,56", "por la cantidad de Bs. 1.234,56", "1.234,56 Bs", etc.
  const amountRegexes = [
    // 1. Keyword followed by optional currency and amount with thousands (.) and decimal (,)
    /(?:monto|importe|cantidad|debito por|compra de|transferencia por|pago de|por la cantidad de|por|monto de):?\s*(?:Bs\.?|VES|Bs\.S)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i,
    // 2. Currency symbol prefix (Bs. 1.250,00 or Bs.1.250,00 or VES 1.250,00)
    /(?:Bs\.?|VES|Bs\.S)\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i,
    // 3. Amount followed by currency suffix (1.250,00 Bs. or 1250,00 Bs)
    /(\d{1,3}(?:\.\d{3})*(?:,\d{2}))\s*(?:Bs\.?|VES|Bs\.S)/i,
    // 4. "Monto: 1250,00" or "Importe: 1250,00"
    /(?:monto|importe|cantidad):?\s*(\d{1,3}(?:[\.\,]\d{3})*(?:[\.\,]\d{2}))/i,
    // 5. Plain number with comma decimal format: 1250,00 or 450,50
    /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/,
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

  // Fallback regex for simpler numeric formats (e.g. Bs. 1500.50 or Bs 1500)
  const simpleRegexes = [
    /(?:Bs\.?|VES|Bs\.S)\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:Bs\.?|VES|Bs\.S)/i
  ];

  for (const regex of simpleRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

function parseMerchant(text: string, subject: string): string {
  // First, extract amount patterns to clean them from text
  const amountRegex = /(?:Bs\.?|VES|Bs\.S)?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi;
  let cleanedText = text.replace(amountRegex, "");

  const merchantRegexes = [
    /(?:a favor de|en favor de|beneficiario:?|destinatario:?|destino:?)\s+([A-Z0-9\s#\-]{3,30})/i,
    /(?:realizado en|compra en|consumo en|debito en|establecido en|comercio)\s+([A-Z0-9\s#\-]{3,30})/i,
    /(?:pago movil a|transferencia a|transferido a|enviado a|pago a|tpago a)\s+([A-Z0-9\s#\-]{3,30})/i,
    /(?:a la cuenta de|cuenta destino:?)\s+([A-Z0-9\s#\-]{3,30})/i,
    /\b(?:en|a)\s+([A-Z0-9\s#\-]{3,30})/i,
  ];

  for (const regex of merchantRegexes) {
    const match = cleanedText.match(regex);
    if (match && match[1]) {
      let name = match[1].trim();
      
      // Clean up common trailing words
      name = name.replace(/\s+(el|la|del|de|fecha|con|por|desde|monto|bs|banco|cuenta)\b.*/i, "");
      name = name.trim();

      const lower = name.toLowerCase();
      if (
        lower !== "favor de" &&
        lower !== "cuenta" &&
        lower !== "la cantidad" &&
        lower !== "un monto" &&
        name.length >= 3
      ) {
        return name.toUpperCase();
      }
    }
  }

  // Defaults for Mercantil / Transfer / Tpago if no specific merchant/beneficiary found
  const combined = `${subject} ${text}`.toLowerCase();
  if (combined.includes("tpago")) {
    return "MERCANTIL TPAGO";
  }
  if (combined.includes("mercantil")) {
    return "TRANSFERENCIA MERCANTIL";
  }
  if (combined.includes("transferencia")) {
    return "TRANSFERENCIA BANCARIA";
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
        data: {
          email_id: formData.get("email_id") || formData.get("id"),
        }
      };
    } else {
      // Fallback text parsing if raw format
      const rawText = await request.text();
      body = { text: rawText };
    }

    // 1. Audit logs
    console.log("Webhook Expenses-Email body keys:", Object.keys(body || {}));
    if (body?.data && typeof body.data === "object") {
      console.log("Webhook Expenses-Email body.data keys:", Object.keys(body.data));
    }

    // 2. Extract payload fields (checking Resend structure: body.data vs body)
    let rawText = (body.data?.text || body.data?.body_plain || body.text || body["body-plain"] || "").toString();
    let rawHtml = (body.data?.html || body.data?.body_html || body.html || body["body-html"] || "").toString();
    let emailSubject = (body.data?.subject || body.subject || "").toString();
    let rawFrom = body.data?.from || body.from || body.sender || "";
    let emailId = body.data?.email_id || body.data?.id || body.email_id || body.id || "";

    // 3. Fallback: Fetch full email from Resend API if body content is missing but ID is present
    if (!rawText && !rawHtml && emailId && process.env.RESEND_API_KEY) {
      console.log(`Webhook Expenses-Email: Text/HTML missing. Fetching email ID ${emailId} from Resend API...`);
      try {
        let res = await fetch(`https://api.resend.com/emails/${emailId}`, {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
        });
        if (!res.ok) {
          res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
          });
        }
        if (res.ok) {
          const fetchedData = await res.json();
          rawText = fetchedData.text || rawText;
          rawHtml = fetchedData.html || rawHtml;
          emailSubject = emailSubject || fetchedData.subject || "";
          rawFrom = rawFrom || fetchedData.from || "";
        } else {
          console.warn(`Resend API fetch returned status ${res.status}`);
        }
      } catch (err: any) {
        console.warn("Failed to fetch email from Resend API:", err.message);
      }
    }

    // 4. Normalize and clean HTML content into plain text
    let emailContent = rawText;
    if (!emailContent && rawHtml) {
      emailContent = stripHtml(rawHtml);
    } else if (rawHtml && emailContent) {
      const cleanHtmlText = stripHtml(rawHtml);
      if (cleanHtmlText.length > emailContent.length) {
        emailContent = cleanHtmlText;
      }
    }

    // Audit log: first 200 characters of emailContent
    console.log("Webhook Expenses-Email emailContent snippet (first 200 chars):", emailContent.slice(0, 200));

    // 5. Identify User
    let senderEmail = "";
    const fromStr = Array.isArray(rawFrom) ? rawFrom[0] || "" : rawFrom.toString();
    if (fromStr) {
      const match = fromStr.match(/<([^>]+)>/);
      senderEmail = match ? match[1] : fromStr.trim();
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
      console.warn("Webhook Expenses-Email: User not found", { paramUserId, targetEmail, senderEmail });
      return NextResponse.json(
        { error: "Usuario no encontrado para registrar el gasto." },
        { status: 404 }
      );
    }

    // 6. Parse Amount & Merchant
    const amount = parseAmount(emailContent);
    if (amount === null) {
      console.warn("Webhook Expenses-Email: Amount not found in email content", { emailContent });
      return NextResponse.json(
        { error: "No se pudo extraer el monto del correo." },
        { status: 400 }
      );
    }

    const merchant = parseMerchant(emailContent, emailSubject);

    // 7. Check Idempotency (prevent duplicate registration on webhook retries)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingExpense = await prisma.expense.findFirst({
      where: {
        userId: user.id,
        amount,
        currency: "VES",
        source: "AUTOMATIC",
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
    });

    if (existingExpense) {
      console.info("Webhook Expenses-Email: Duplicate expense ignored (idempotency check)", {
        expenseId: existingExpense.id,
        user: user.email,
        amount: `${amount} VES`,
      });

      return NextResponse.json({
        success: true,
        message: "Gasto ya registrado previamente (duplicado omitido por idempotencia).",
        expense: {
          id: existingExpense.id,
          description: existingExpense.description,
          amount: existingExpense.amount,
          currency: existingExpense.currency,
          equivalentAmount: existingExpense.equivalentAmount,
          source: existingExpense.source,
        },
      });
    }

    // 8. Get Exchange Rate & Calculate Equivalent Amount
    const exchangeRate = await getLatestExchangeRate();
    const equivalentAmount = amount / exchangeRate; // Since bank emails are in VES

    // 9. Find Category
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

    // 10. Create Expense in database
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
