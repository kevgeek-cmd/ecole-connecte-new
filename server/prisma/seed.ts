import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Super Admin
  const superAdminEmail = 'superadmin@example.com';
  let superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });

  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('Created Super Admin:', superAdmin.email);
  }

/*
  // 2. Create School
  const schoolName = 'École Démo';
  let school = await prisma.school.findFirst({ where: { name: schoolName } });

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: schoolName,
        address: '123 Rue de l\'École',
      },
    });
    console.log('Created School:', school.name);
  }

  // 3. Create School Admin
  const schoolAdminEmail = 'admin@ecole.com';
  let schoolAdmin = await prisma.user.findUnique({ where: { email: schoolAdminEmail } });

  if (!schoolAdmin) {
    schoolAdmin = await prisma.user.create({
      data: {
        email: schoolAdminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'École',
        role: 'SCHOOL_ADMIN',
        schoolId: school.id,
      },
    });
    
    // Set as manager
    await prisma.school.update({
        where: { id: school.id },
        data: { managerId: schoolAdmin.id }
    });

    console.log('Created School Admin:', schoolAdmin.email);
  }

  // 4. Create Teacher
  const teacherEmail = 'prof@ecole.com';
  let teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });

  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        email: teacherEmail,
        password: hashedPassword,
        firstName: 'Jean',
        lastName: 'Professeur',
        role: 'TEACHER',
        schoolId: school.id,
      },
    });
    console.log('Created Teacher:', teacher.email);
  }

  // 5. Create Student
  const studentEmail = 'eleve@ecole.com';
  let student = await prisma.user.findUnique({ where: { email: studentEmail } });

  if (!student) {
    student = await prisma.user.create({
      data: {
        email: studentEmail,
        password: hashedPassword,
        firstName: 'Paul',
        lastName: 'Élève',
        role: 'STUDENT',
        schoolId: school.id,
      },
    });
    console.log('Created Student:', student.email);
  }

  // 6. Create Academic Year and Term (Required for Grading)
  const currentYear = new Date().getFullYear();
  const yearName = `${currentYear}-${currentYear + 1}`;
  let academicYear = await prisma.academicYear.findFirst({ where: { schoolId: school.id, name: yearName } });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: yearName,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${currentYear + 1}-06-30`),
        schoolId: school.id,
      },
    });
    console.log('Created Academic Year:', academicYear.name);

    // Create Terms
    await prisma.term.createMany({
      data: [
        {
          name: 'Trimestre 1',
          startDate: new Date(`${currentYear}-09-01`),
          endDate: new Date(`${currentYear}-12-31`),
          academicYearId: academicYear.id,
          status: 'OPEN', // Important for grading to work immediately
        },
        {
          name: 'Trimestre 2',
          startDate: new Date(`${currentYear + 1}-01-01`),
          endDate: new Date(`${currentYear + 1}-03-31`),
          academicYearId: academicYear.id,
          status: 'CLOSED',
        },
        {
          name: 'Trimestre 3',
          startDate: new Date(`${currentYear + 1}-04-01`),
          endDate: new Date(`${currentYear + 1}-06-30`),
          academicYearId: academicYear.id,
          status: 'CLOSED',
        },
      ],
    });
    console.log('Created Terms for Academic Year');
  }
  */
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
