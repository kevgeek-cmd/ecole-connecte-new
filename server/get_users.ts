
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        role: 'asc',
      },
      select: {
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        // On ne peut pas récupérer le mot de passe car il est hashé
      }
    });

    console.log("--- START USER LIST ---");
    console.log(JSON.stringify(users, null, 2));
    console.log("--- END USER LIST ---");
  } catch (error) {
    console.error("Error fetching users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
