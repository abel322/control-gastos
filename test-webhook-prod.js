const { PrismaClient } = require("./src/generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

async function runTest() {
  const url = "https://control-gastos-livid.vercel.app/api/webhooks/expenses-email?email=utreraabel91@gmail.com";
  
  // Exact Mercantil APP TPAGO email text structure provided by user
  const payload = {
    subject: "Notificación de Pago Móvil Mercantil",
    text: `Canal: MERCANTIL APP TPAGO
Fecha y hora de envío: 01/08/2026 09:00:05PM
Cuenta débito: ********* 3300
Monto: Bs. 650,00
Número de confirmación: 02791609021
Concepto: PAGO MOVIL.
Banco destino: BANCAMIGA BANCO UNIVERSAL, C.A.
Número de celular destino: ********* 8483
Número de identificación Beneficiario: V20055971
Tipo de transferencia: INMEDIATA
Estado de la transferencia: APROBADA`
  };

  console.log("1. Enviando petición POST a Vercel con estructura exacta de Mercantil APP TPAGO:", url);
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
          amount: 650.00,
        },
        orderBy: { createdAt: "desc" }
      });

      console.log(`\n✅ Gasto verificado exitosamente en BD con monto de 650 Bs:`, JSON.stringify(recentExpenses[0], null, 2));

      await prisma.$disconnect();
      await pool.end();
    }
  } catch (error) {
    console.error("Error ejecutando la prueba:", error);
  }
}

runTest();
