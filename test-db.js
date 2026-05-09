const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Conectando a Neon...");
  const hashed = await bcrypt.hash('123456', 10);
  const user = await prisma.user.create({
    data: { 
      name: 'Admin', 
      email: 'admin@test.com', 
      password: hashed, 
      role: 'admin' 
    }
  });
  console.log('Usuario creado exitosamente:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
