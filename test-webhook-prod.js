const { PrismaClient } = require("./src/generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

async function runTest() {
  const url = "https://control-gastos-livid.vercel.app/api/webhooks/expenses-email?email=utreraabel91@gmail.com";
  
  // Simulated Mercantil Transfer email payload with integer amount without decimals
  const payload = {
    subject: "Usted ha realizado una transferencia",
    text: "Estimado cliente, usted ha realizado una transferencia por Bs. 15000 el 01/08/2026."
  };

  console.log("1. Enviando petición POST a Vercel con monto entero sin decimales:", url);
  console.log("Cuerpo:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("\n2. Respuesta recibida:");
    console.log("Estado:", response.status, response.statusText);
    const body = await response.json();
    console.log("Respuesta:", JSON.stringify(body, null, 2));

    if (response.ok && body.success) {
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
          amount: 15000,
        },
        orderBy: { createdAt: "desc" }
      });

      console.log(`\n✅ Gasto registrado en BD con monto entero 15000 Bs:`, JSON.stringify(recentExpenses[0], null, 2));

      await prisma.$disconnect();
      await pool.end();
    }
  } catch (error) {
    console.error("Error ejecutando la prueba:", error);
  }
}

runTest();
