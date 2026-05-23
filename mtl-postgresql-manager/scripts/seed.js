const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  // Read credentials from environment variables
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  
  try {
    const existingAdmin = await prisma.adminUser.findUnique({ 
      where: { username } 
    });
    
    if (!existingAdmin) {
      const hash = await bcrypt.hash(password, 12);
      await prisma.adminUser.create({
        data: { username, passwordHash: hash }
      });
      console.log(`Admin created: ${username}/${password}`);
    } else {
      console.log(`Admin user "${username}" already exists`);
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
