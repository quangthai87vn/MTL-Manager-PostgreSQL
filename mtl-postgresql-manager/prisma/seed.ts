import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existingUser = await prisma.adminUser.findUnique({
    where: { username: adminUsername },
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.create({
      data: {
        username: adminUsername,
        passwordHash,
      },
    });
    console.log(`Created admin user: ${adminUsername}`);
    console.log(`Password: ${adminPassword}`);
  } else {
    console.log(`Admin user "${adminUsername}" already exists`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
