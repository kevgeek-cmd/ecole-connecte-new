import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);
  const userPassword = await bcrypt.hash('nestorkoffi', 10);

  // 1. Create Super Admin
  const superAdminEmail = 'superadmin@example.com';
  const userEmail = 'llateamd@gmail.com';

  const admins = [
    { email: superAdminEmail, password: hashedPassword, firstName: 'Super', lastName: 'Admin' },
    { email: userEmail, password: userPassword, firstName: 'User', lastName: 'Admin' }
  ];

  for (const adminData of admins) {
    const admin = await prisma.user.upsert({
      where: { email: adminData.email },
      update: {
        password: adminData.password,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: 'SUPER_ADMIN',
      },
      create: {
        email: adminData.email,
        password: adminData.password,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: 'SUPER_ADMIN',
      },
    });
    console.log('Upserted Super Admin:', admin.email);
  }

  // 2. Create School
  const schoolName = 'École Connectée Test';
  let school = await prisma.school.findFirst({ where: { name: schoolName } });

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: schoolName,
        address: '123 Rue de l\'École',
        isActive: true,
      },
    });
    console.log('Created School:', school.name);
  } else {
    school = await prisma.school.update({
      where: { id: school.id },
      data: { isActive: true }
    });
    console.log('Updated School:', school.name);
  }

  // Ensure user accounts are also linked to this school if needed, 
  // though SUPER_ADMIN doesn't strictly need it.
  // Let's create another school for variety
  const school2Name = 'Lycée Excellence';
  let school2 = await prisma.school.findFirst({ where: { name: school2Name } });
  if (!school2) {
    school2 = await prisma.school.create({
      data: {
        name: school2Name,
        address: '456 Avenue des Talents',
        isActive: true,
      },
    });
    console.log('Created School:', school2.name);
  } else {
     school2 = await prisma.school.update({
      where: { id: school2.id },
      data: { isActive: true }
    });
  }

  // 3. Create School Admin
  const schoolAdminEmail = 'admin@ecole.com';
  
  const schoolAdmin = await prisma.user.upsert({
    where: { email: schoolAdminEmail },
    update: {
        password: hashedPassword,
        firstName: 'Directeur',
        lastName: 'Ecole',
        role: 'SCHOOL_ADMIN',
        schoolId: school.id,
    },
    create: {
        email: schoolAdminEmail,
        password: hashedPassword,
        firstName: 'Directeur',
        lastName: 'Ecole',
        role: 'SCHOOL_ADMIN',
        schoolId: school.id,
    }
  });
  console.log('Upserted School Admin:', schoolAdmin.email);


  // 4. Create Teacher
  const teacherEmail = 'prof@ecole.com';
  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: {
        password: hashedPassword,
        firstName: 'Jean',
        lastName: 'Professeur',
        role: 'TEACHER',
        schoolId: school.id,
    },
    create: {
        email: teacherEmail,
        password: hashedPassword,
        firstName: 'Jean',
        lastName: 'Professeur',
        role: 'TEACHER',
        schoolId: school.id,
    }
  });
  console.log('Upserted Teacher:', teacher.email);

  // 5. Create Student
  const studentEmail = 'eleve@ecole.com';
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {
        password: hashedPassword,
        firstName: 'Paul',
        lastName: 'Etudiant',
        role: 'STUDENT',
        schoolId: school.id,
    },
    create: {
        email: studentEmail,
        password: hashedPassword,
        firstName: 'Paul',
        lastName: 'Etudiant',
        role: 'STUDENT',
        schoolId: school.id,
    }
  });
  console.log('Upserted Student:', student.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
