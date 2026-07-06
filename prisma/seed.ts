// Seeds the first admin user. Run with: npx prisma db seed
// Requires DATABASE_URL to point at a real, reachable database matching
// DATABASE_PROVIDER (postgresql | mysql | mariadb).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { createDriverAdapter } from "../lib/prisma-adapter";

const prisma = new PrismaClient({ adapter: createDriverAdapter() } as any);

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role: "admin" },
  });

  console.log(`Seeded admin user: ${user.email} (role: ${user.role})`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`Default password "${password}" — change it after first login.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
