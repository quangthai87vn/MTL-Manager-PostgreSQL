#!/bin/sh

echo "Initializing database..."
/app/node_modules/.bin/prisma generate
/app/node_modules/.bin/prisma db push
node -e "const Prisma=require('./node_modules/@prisma/client');const bcrypt=require('./node_modules/bcryptjs');const p=new Prisma.PrismaClient();(async()=>{try{const u=await p.adminUser.findUnique({where:{username:'admin'}});if(!u){await p.adminUser.create({data:{username:'admin',passwordHash:await bcrypt.hash('admin123',12)}});console.log('Admin created: admin/admin123')}else{console.log('Admin exists')}}finally{await p.\$disconnect()}})()"
echo "Starting Next.js..."
exec node server.js
