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

// Helper to clean raw numeric strings (e.g. "1.500,00", "15.000", "15000,50", "45000", "600,00") into floats
function cleanAndParseNumber(str: string): number | null {
  if (!str) return null;
  let s = str.trim();

  // If contains comma, dot is thousand separator and comma is decimal separator
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // If format is 15.000 or 1.500.000 (dots as thousand separators without decimal comma)
    s = s.replace(/\./g, "");
  }

  const num = parseFloat(s);
  if (!isNaN(num) && num > 0) {
    return num;
  }
  return null;
}

// Helper to extract amount directly from HTML tables (e.g., Mercantil, Bancamiga, etc.)
function parseHtmlTableAmount(html: string): number | null {
  if (!html) return null;

  // Match <td> or <th> containing "Monto" or "Importe" (excluding noise words like comisión, saldo, impuesto, referencia)
  // followed by an adjacent cell with the numeric value
  const cellPairRegex = /<t[dh][^>]*>(?:(?!comisi|saldo|impuesto|referencia).)*?(?:monto|importe)[^<]*<\/t[dh]>\s*<t[dh][^>]*>([^<]+)<\/t[dh]>/gi;

  let match;
  while ((match = cellPairRegex.exec(html)) !== null) {
    if (match[1]) {
      const val = stripHtml(match[1]);
      const parsed = cleanAndParseNumber(val);
      if (parsed !== null) return parsed;
    }
  }

  return null;
}

// Robust multi-strategy helper to extract amount from email text/HTML
function parseAmount(text: string, html?: string): number | null {
  if (!text && !html) return null;

  // Strategy 1: Try HTML table cell extraction if HTML is provided
  if (html) {
    const tableAmount = parseHtmlTableAmount(html);
    if (tableAmount !== null) return tableAmount;
  }

  const cleanText = (text || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");

  // Strip dates (e.g. 01/08/2026 or 01-08-2026) so dates aren't misparsed as amounts
  const textWithoutDates = cleanText.replace(/\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g, " [FECHA] ");

  // Strategy 2: Remove noise lines (Commission, Balance, Tax, Reference) that contain distracting numbers
  const lines = textWithoutDates.split(/\r?\n/);
  const filteredLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Ignore lines that describe commission, balance, tax, or reference numbers
    if (
      lower.includes("comisión") ||
      lower.includes("comision") ||
      lower.includes("saldo") ||
      lower.includes("disponible") ||
      lower.includes("impuesto") ||
      lower.includes("igtf") ||
      lower.includes("referencia") ||
      lower.includes("ref.") ||
      lower.includes("nro. ref") ||
      lower.includes("número de confirmación") ||
      lower.includes("numero de confirmacion")
    ) {
      // If the subsequent line is just a number, skip it too
      if (i + 1 < lines.length && /^\s*(?:Bs\.?|VES|USD|\$)?\s*\d+[\d\.,]*\s*$/i.test(lines[i + 1])) {
        i++;
      }
      continue;
    }
    filteredLines.push(line);
  }

  const noiseFreeText = filteredLines.join("\n");

  // Precise pattern for Venezuelan or standard currency amount:
  // Part 1: Formatted with thousands dots & decimal comma: 15.000,00
  // Part 2: Formatted with thousand dots only: 15.000 or 1.500.000
  // Part 3: Plain integer or comma decimal: 45000 or 45000,50 or 600,00
  const numPattern = `(\\d{1,3}(?:\\.\\d{3})*,\\d{1,2}|\\d{1,3}(?:\\.\\d{3})+|\\d+(?:,\\d{1,2})?|\\d+)`;

  // Strategy 3: Priority 1 - Explicit Amount Phrases ("Monto:", "Monto de:", "por la cantidad de", "importe:")
  const explicitPhrasesRegex = new RegExp(
    `(?:monto\\s*de\\s*:?|por\\s+la\\s+cantidad\\s+de|por\\s+la\\s+suma\\s+de|por\\s+un\\s+monto\\s+de|importe\\s*:?|monto\\s*del?\\s*pago\\s*:?|monto\\s*debitado\\s*:?|monto\\s*transferido\\s*:?|monto\\s*\\(?\\s*(?:Bs|VES|USD|\\$)?\\s*\\)?\\s*:?)\\s*(?:Bs\\.?|VES|Bs\\.S|USD|\\$)?\\s*${numPattern}`,
    "i"
  );

  const explicitMatch = noiseFreeText.match(explicitPhrasesRegex);
  if (explicitMatch && explicitMatch[1]) {
    const parsed = cleanAndParseNumber(explicitMatch[1]);
    if (parsed !== null) return parsed;
  }

  // Also check explicit phrases on original text if noise filtering removed context
  const explicitMatchOriginal = textWithoutDates.match(explicitPhrasesRegex);
  if (explicitMatchOriginal && explicitMatchOriginal[1]) {
    const parsed = cleanAndParseNumber(explicitMatchOriginal[1]);
    if (parsed !== null) return parsed;
  }

  // Strategy 4: Priority 2 - Generic Transaction Keywords on noise-free text
  const transactionKeywordRegex = new RegExp(
    `(?:debito por|compra de|compra por|transferencia por|pago de|pago por|por)\\s*(?:Bs\\.?|VES|Bs\\.S|USD|\\$)?\\s*${numPattern}`,
    "i"
  );
  const transactionMatch = noiseFreeText.match(transactionKeywordRegex);
  if (transactionMatch && transactionMatch[1]) {
    const parsed = cleanAndParseNumber(transactionMatch[1]);
    if (parsed !== null) return parsed;
  }

  // Strategy 5: Explicit Currency Prefix on noise-free text: "Bs. 600,00", "Bs 15000", "VES 1200,50", "$ 150"
  const prefixRegex = new RegExp(`(?:Bs\\.?|VES|Bs\\.S|USD|\\$)\\s*${numPattern}`, "i");
  const prefixMatch = noiseFreeText.match(prefixRegex);
  if (prefixMatch && prefixMatch[1]) {
    const parsed = cleanAndParseNumber(prefixMatch[1]);
    if (parsed !== null) return parsed;
  }

  // Strategy 6: Explicit Currency Suffix on noise-free text: "600,00 Bs", "15000 Bs."
  const suffixRegex = new RegExp(`${numPattern}\\s*(?:Bs\\.?|VES|Bs\\.S|USD|\\$)`, "i");
  const suffixMatch = noiseFreeText.match(suffixRegex);
  if (suffixMatch && suffixMatch[1]) {
    const parsed = cleanAndParseNumber(suffixMatch[1]);
    if (parsed !== null) return parsed;
  }

  // Strategy 7: Fallback for numbers with Venezuelan decimal comma format: e.g. "600,00" or "1.250,00" or "450,50"
  const commaDecimalRegex = /\b(\d{1,3}(?:\.\d{3})*,\d{1,2}|\d+,\d{1,2})\b/g;
  const commaMatches = Array.from(noiseFreeText.matchAll(commaDecimalRegex));
  for (const match of commaMatches) {
    if (match[1]) {
      const parsed = cleanAndParseNumber(match[1]);
      if (parsed !== null) return parsed;
    }
  }

  // Strategy 8: Fallback for standalone numbers with thousand dots: e.g. "15.000" or "1.500"
  const dotThousandsRegex = /\b(\d{1,3}(?:\.\d{3})+)\b/g;
  const dotMatches = Array.from(noiseFreeText.matchAll(dotThousandsRegex));
  for (const match of dotMatches) {
    if (match[1]) {
      const parsed = cleanAndParseNumber(match[1]);
      if (parsed !== null) return parsed;
    }
  }

  return null;
}

function parseMerchant(text: string, subject: string): string {
  // 1. Specific Mercantil TPAGO key-value extraction (e.g. Banco destino, Concepto, Beneficiario)
  const bankDestinoMatch = text.match(/banco\s+destino\s*:?\s*([^\n\r]+)/i);
  let targetBank = "";
  if (bankDestinoMatch && bankDestinoMatch[1]) {
    targetBank = bankDestinoMatch[1].trim();
    // Clean up trailing terms like "BANCO UNIVERSAL", "C.A.", "S.A.", punctuation
    targetBank = targetBank.replace(/\b(banco\s+universal|banco|c\.?a\.?|s\.?a\.?|bca)\b/gi, "");
    targetBank = targetBank.replace(/[^a-z0-9]/gi, " ").replace(/\s+/g, " ").trim();
  }

  const conceptoMatch = text.match(/concepto\s*:?\s*([^\n\r]+)/i);
  let concepto = "";
  if (conceptoMatch && conceptoMatch[1]) {
    concepto = conceptoMatch[1].trim().replace(/\.$/, "");
    if (concepto.toLowerCase() === "pago movil" || concepto.toLowerCase() === "pago movil.") {
      concepto = ""; // Generic concept, keep blank to use bank name or default
    }
  }

  // Match Beneficiario name (only if it's a name, skipping RIF / Identification lines like V20055971)
  const beneficiarioMatch = text.match(/(?:nombre\s+del?\s+beneficiario|beneficiario\s*:)\s*([^\n\r]+)/i);
  let beneficiario = "";
  if (beneficiarioMatch && beneficiarioMatch[1]) {
    let rawBen = beneficiarioMatch[1].split(/[\r\n]/)[0].trim();
    rawBen = rawBen.replace(/\s+(tipo|estado|fecha|cuenta|banco)\b.*/i, "").trim();
    // Skip raw RIFs / CI / ID numbers like V20055971, V-20055971
    if (!/^[VJEGP]-?\d+$/i.test(rawBen) && !/^\d+$/.test(rawBen) && rawBen.length >= 3) {
      beneficiario = rawBen.toUpperCase();
    }
  }

  if (beneficiario) {
    return beneficiario;
  }
  if (concepto) {
    return concepto.toUpperCase();
  }
  if (targetBank) {
    return `PAGO MÓVIL MERCANTIL (${targetBank.toUpperCase()})`;
  }

  // 2. Generic Regex search for merchant/beneficiary
  const amountRegex = /(?:Bs\.?|VES|Bs\.S)?\s*\d+(?:\.\d{3})*(?:,\d{1,2})?/gi;
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

  // 3. Defaults for Mercantil / Transfer / Tpago if no specific merchant/beneficiary found
  const combined = `${subject} ${text}`.toLowerCase();
  if (combined.includes("tpago") || combined.includes("pago movil")) {
    return "PAGO MÓVIL MERCANTIL";
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

    // 6. Parse Amount & Merchant (passing rawHtml as well for HTML table cell extraction)
    const amount = parseAmount(emailContent, rawHtml);
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
