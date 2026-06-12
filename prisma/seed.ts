import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@stresstest.local";
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Demo User", role: "admin" },
  });

  await prisma.logEntry.create({
    data: { level: "info", source: "seed", message: "Database seeded", context: { userId: user.id } },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded demo user: ${email} / password123`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
