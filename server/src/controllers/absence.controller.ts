import { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";

const createAbsenceSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().transform((str) => new Date(str)),
  reason: z.string().optional(),
  justified: z.boolean().optional(),
});

export const createAbsence = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, date, reason, justified } = createAbsenceSchema.parse(req.body);

    const absence = await prisma.absence.create({
      data: {
        studentId,
        date,
        reason,
        justified: justified || false,
      },
    });

    res.status(201).json(absence);
  } catch (error) {
    console.error("Error creating absence:", error);
    res.status(400).json({ message: "Invalid data", error });
  }
};

export const getAbsences = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, classId } = req.query;
    const user = req.user;

    const where: any = {};

    // If student, can only see own absences
    if (user?.role === 'STUDENT') {
        where.studentId = user.id;
    } else {
        if (studentId) where.studentId = String(studentId);
        if (classId) {
            where.student = {
                classId: String(classId)
            };
        }
    }

    const absences = await prisma.absence.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { name: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(absences);
  } catch (error) {
    console.error("Error fetching absences:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateAbsence = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason, justified, date } = req.body;

        const updateData: any = {};
        if (reason !== undefined) updateData.reason = reason;
        if (justified !== undefined) updateData.justified = justified;
        if (date) updateData.date = new Date(date);

        const absence = await prisma.absence.update({
            where: { id },
            data: updateData
        });

        res.json(absence);
    } catch (error) {
        console.error("Error updating absence:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

export const deleteAbsence = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.absence.delete({ where: { id } });
        res.json({ message: "Absence deleted" });
    } catch (error) {
        console.error("Error deleting absence:", error);
        res.status(500).json({ message: "Server error", error });
    }
};
