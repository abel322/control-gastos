const { PrismaClient } = require("./src/generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

async function runTest() {
  const url = "http://localhost:3000/api/webhooks/expenses-email?email=usuario@demo.com";
  const payload = {
    subject: "Notificación de Pago Móvil",
    text: "Banesco Banco Universal informa: Pago Movil por Bs. 2.500,00 a favor de FARMATODO el 01/08/2026."
  };

  console.log("1. Enviando petición POST a:", url);
  console.log("Cuerpo:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("\n2. Respuesta recibida:");
    console.log("Estado:", response.status, response.statusText);
    
    const responseBody = await response.json();
    console.log("Cuerpo de respuesta:", JSON.stringify(responseBody, null, 2));

    if (response.ok && responseBody.success) {
      console.log("\n3. Verificando base de datos...");
      
      const connectionString = process.env.DATABASE_URL;
      const pool = new Pool({ connectionString });
      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });

      // Find the user first to make sure we lookup the right expenses
      const user = await prisma.user.findUnique({
        where: { email: "usuario@demo.com" }
      });

      if (!user) {
        console.error("No se encontró el usuario usuario@demo.com en la base de datos.");
        await pool.end();
        return;
      }

      // Find recently created expenses for this user
      const recentExpenses = await prisma.expense.findMany({
        where: {
          userId: user.id,
          amount: 2500,
          description: {
            contains: "FARMATODO"
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      });

      if (recentExpenses.length > 0) {
        console.log("✅ Gasto verificado exitosamente en la base de datos:");
        console.log(JSON.stringify(recentExpenses[0], null, 2));
      } else {
        console.log("❌ No se encontró el gasto en la base de datos.");
      }

      await prisma.$disconnect();
      await pool.end();
    } else {
      console.log("❌ El webhook falló o no devolvió success.");
    }
  } catch (error) {
    console.error("Error ejecutando la prueba:", error);
  }
}

runTest();
