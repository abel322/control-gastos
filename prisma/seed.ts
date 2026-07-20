import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create default categories
  const categories = [
    { name: "Alimentación", icon: "🍔", color: "#f59e0b" },
    { name: "Transporte", icon: "🚗", color: "#3b82f6" },
    { name: "Vivienda", icon: "🏠", color: "#8b5cf6" },
    { name: "Salud", icon: "💊", color: "#ef4444" },
    { name: "Educación", icon: "📚", color: "#06b6d4" },
    { name: "Entretenimiento", icon: "🎬", color: "#ec4899" },
    { name: "Servicios", icon: "💡", color: "#f97316" },
    { name: "Ropa", icon: "👕", color: "#14b8a6" },
    { name: "Tecnología", icon: "💻", color: "#6366f1" },
    { name: "Iglesia", icon: "⛪", color: "#10b981" },
    { name: "Otros", icon: "📦", color: "#6b7280" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log(`✅ ${categories.length} categories created`);

  // Create a default user
  const user = await prisma.user.upsert({
    where: { email: "usuario@demo.com" },
    update: {},
    create: {
      email: "usuario@demo.com",
      name: "Usuario Demo",
    },
  });

  console.log(`✅ Default user created: ${user.email}`);

  // Create default exchange rate (BCV)
  const rate = await prisma.exchangeRate.create({
    data: {
      rate: 1420.0,
    },
  });

  console.log(`✅ Exchange rate set: ${rate.rate} Bs/$`);

  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
