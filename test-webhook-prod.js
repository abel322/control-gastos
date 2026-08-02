const { PrismaClient } = require("./src/generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

async function runTest() {
  const url = "https://control-gastos-livid.vercel.app/api/webhooks/expenses-email?email=utreraabel91@gmail.com";
  
  // Simulated Mercantil Transfer email payload
  const payload = {
    subject: "Usted ha realizado una transferencia",
    text: "Mercantil Banco Universal informa: Ha realizado una transferencia por la cantidad de Bs. 3.450,25 a favor de CARLOS BLANCO el 01/08/2026."
  };

  console.log("1. Enviando petición POST a Vercel con correo de Mercantil:", url);
  console.log("Cuerpo:", JSON.stringify(payload, null, 2));

  try {
    // First Call
    console.log("\n--- PRIMERA LLAMADA (Creación) ---");
    const response1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("Estado:", response1.status, response1.statusText);
    const body1 = await response1.json();
    console.log("Respuesta 1:", JSON.stringify(body1, null, 2));

    // Second Call (Retry - testing Idempotency)
    console.log("\n--- SEGUNDA LLAMADA (Prueba de Idempotencia / Reintento de Resend) ---");
    const response2 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("Estado:", response2.status, response2.statusText);
    const body2 = await response2.json();
    console.log("Respuesta 2 (Duplicado omitido por idempotencia):", JSON.stringify(body2, null, 2));

    if (response1.ok && response2.ok) {
      console.log("\n3. Verificando base de datos...");
      
      const connectionString = process.env.DATABASE_URL;
      const pool = new Pool({ connectionString });
      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });

      const user = await prisma.user.findUnique({
        where: { email: "utreraabel91@gmail.com" }
      });

      const recentExpenses = await prisma.expense.findMany({
        where: {
          userId: user.id,
          amount: 3450.25,
          description: { contains: "CARLOS BLANCO" }
        },
        orderBy: { createdAt: "desc" }
      });

      console.log(`\n✅ Cantidad de registros creados en BD para este monto (DEBE SER EXACTAMENTE 1): ${recentExpenses.length}`);
      if (recentExpenses.length === 1) {
        console.log("🎉 SUCCESS: ¡El chequeo de idempotencia evitó duplicar el gasto!");
      } else {
        console.log("⚠️ Aún no se ha completado el despliegue en Vercel.");
      }
      console.log("Registro en BD:", JSON.stringify(recentExpenses[0], null, 2));

      await prisma.$disconnect();
      await pool.end();
    }
  } catch (error) {
    console.error("Error ejecutando la prueba:", error);
  }
}

runTest();
