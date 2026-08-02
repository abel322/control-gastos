const { PrismaClient } = require("./src/generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

async function runTest() {
  const url = "https://control-gastos-livid.vercel.app/api/webhooks/expenses-email?email=utreraabel91@gmail.com";
  
  // Simulated Mercantil Email with noisy numbers: Commission (1,00 Bs), Saldo (45.000,00 Bs), Reference (987654321), and actual Amount (2.500,00 Bs)
  const payload = {
    subject: "Notificación de Transferencia Mercantil",
    html: `
      <div>
        <h2>Mercantil Banco Universal</h2>
        <p>Estimado Cliente, su operación ha sido procesada.</p>
        <table>
          <tr><td>Número de Referencia:</td><td>987654321</td></tr>
          <tr><td>Comisión:</td><td>Bs. 1,00</td></tr>
          <tr><td>Impuesto IGTF:</td><td>Bs. 15,00</td></tr>
          <tr><td>Saldo disponible:</td><td>Bs. 45.000,00</td></tr>
          <tr><td>Monto de la Operación:</td><td>Bs. 2.500,00</td></tr>
          <tr><td>Beneficiario:</td><td>FARMACIA LAS MERCEDES</td></tr>
        </table>
      </div>
    `,
    text: "Mercantil Banco Universal\nReferencia: 987654321\nComisión: Bs. 1,00\nImpuesto IGTF: Bs. 15,00\nSaldo disponible: Bs. 45.000,00\nMonto de la Operación: Bs. 2.500,00\nA favor de FARMACIA LAS MERCEDES"
  };

  console.log("1. Enviando correo con ruido (comisión, saldo, impuesto, referencia) y monto real (2.500,00 Bs):", url);

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
          amount: 2500,
          description: { contains: "FARMACIA LAS MERCEDES" }
        },
        orderBy: { createdAt: "desc" }
      });

      console.log(`\n✅ Gasto verificado en BD con monto EXACTO de 2500 Bs (ignoró comisión 1,00 y saldo 45000):`, JSON.stringify(recentExpenses[0], null, 2));

      await prisma.$disconnect();
      await pool.end();
    }
  } catch (error) {
    console.error("Error ejecutando la prueba:", error);
  }
}

runTest();
