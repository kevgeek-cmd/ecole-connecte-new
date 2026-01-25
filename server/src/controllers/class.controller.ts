import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';

const createClassSchema = z.object({
  name: z.string(),
  level: z.string().optional(),
});

const enrollStudentSchema = z.object({
  studentId: z.string(),
  classId: z.string(),
});

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const { name, level } = createClassSchema.parse(req.body);
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: "User not associated with a school" });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        level: level || null,
        schoolId,
      },
    });

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: "Error creating class", error });
  }
};

export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "User not associated with a school" });
    }

    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: { enrollments: true, courses: true },
        },
      },
    });

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching classes", error });
  }
};

export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const { studentId, classId } = enrollStudentSchema.parse(req.body);

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId,
      },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: "Error enrolling student", error });
  }
};

export const getClassStudents = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "Missing id" });
        
        const students = await prisma.enrollment.findMany({
            where: { classId: String(id) },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        res.json(students.map((e: any) => e.student));
    } catch (error) {
        res.status(500).json({ message: "Error fetching students", error });
    }
}

export const updateClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, level } = createClassSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "Missing id" });

    const updatedClass = await prisma.class.update({
      where: { id: String(id) },
      data: {
        name,
        level: level || null,
      },
    });

    res.json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: "Error updating class", error });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Missing id" });

    await prisma.class.delete({
      where: { id: String(id) },
    });
    res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting class", error });
  }
};

export const importStudents = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // classId
        if (!id) return res.status(400).json({ message: "Missing id" });

        const schoolId = req.user?.schoolId;

        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        // Use buffer since we are using memoryStorage
        if (!req.file.buffer) {
             return res.status(400).json({ message: "File buffer is empty" });
        }
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("Excel file is empty");
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("Sheet not found");
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        let createdCount = 0;
        let enrolledCount = 0;

        for (const row of data) {
            const firstName = row['Prénom'] || row['Prenom'] || row['firstname'] || row['First Name'];
            const lastName = row['Nom'] || row['lastname'] || row['Last Name'];

            if (!firstName || !lastName) continue;

            // Generate email: prenom.nom@ecole.com (simplified)
            const cleanFirstName = firstName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanLastName = lastName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
            const baseEmail = `${cleanFirstName}.${cleanLastName}@ecole.com`;
            
            // Check if user exists
            let user = await prisma.user.findUnique({ where: { email: baseEmail } });
            
            if (!user) {
                 const hashedPassword = await bcrypt.hash("123456", 10);
                 try {
                    user = await prisma.user.create({
                        data: {
                            email: baseEmail,
                            password: hashedPassword,
                            firstName: firstName.toString(),
                            lastName: lastName.toString(),
                            role: "STUDENT",
                            schoolId: schoolId || null
                        }
                    });
                    createdCount++;
                 } catch (e) {
                     // If duplicate email collision happens concurrently or logic fails, skip or handle
                     // For now, if creation fails (e.g. unique constraint), we try to find again or skip
                     console.log(`Skipping ${baseEmail} due to error`, e);
                     continue;
                 }
            }

            // Enroll in class
            const enrollment = await prisma.enrollment.findFirst({
                where: {
                    studentId: user.id,
                    classId: String(id)
                }
            });

            if (!enrollment) {
                await prisma.enrollment.create({
                    data: {
                        studentId: user.id,
                        classId: String(id)
                    }
                });
                enrolledCount++;
            }
        }

        res.json({ message: "Import terminé", created: createdCount, enrolled: enrolledCount });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de l'import", error });
    }
};
