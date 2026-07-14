require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { email: "ejecutivo@carvanta.com" },
    update: {},
    create: {
      name: "Ejecutivo Carvanta",
      email: "ejecutivo@carvanta.com",
      password,
      role: "executive",
    },
  });

  console.log("Usuario creado:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());