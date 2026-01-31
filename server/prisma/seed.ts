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
    let admin = await prisma.user.findUnique({ where: { email: adminData.email } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: adminData.email,
          password: adminData.password,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          role: 'SUPER_ADMIN',
        },
      });
      console.log('Created Super Admin:', admin.email);
    }
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
  }

  // 3. Create School Admin
  const schoolAdminEmail = 'admin@ecole.com';
  let schoolAdmin = await prisma.user.findUnique({ where: { email: schoolAdminEmail } });

  if (!schoolAdmin) {
    schoolAdmin = await prisma.user.create({
      data: {
        email: schoolAdminEmail,
        password: hashedPassword,
        firstName: 'Directeur',
        lastName: 'Ecole',
        role: 'SCHOOL_ADMIN',
        schoolId: school.id,
      },
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
        lastName: 'Etudiant',
        role: 'STUDENT',
        schoolId: school.id,
      },
    });
    console.log('Created Student:', student.email);
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
