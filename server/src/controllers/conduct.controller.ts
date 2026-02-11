import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

const createConductSchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  appreciation: z.string().optional(),
  comment: z.string().optional(),
});

export const createConduct = async (req: Request, res: Response) => {
  try {
    const { studentId, termId, appreciation, comment } = createConductSchema.parse(req.body);

    const conduct = await prisma.conduct.create({
      data: {
        studentId,
        termId,
        appreciation,
        comment,
      },
    });

    res.status(201).json(conduct);
  } catch (error) {
    console.error("Error creating conduct:", error);
    res.status(400).json({ message: "Invalid data", error });
  }
};

export const getConducts = async (req: Request, res: Response) => {
  try {
    const { studentId, classId, termId } = req.query;
    const user = req.user;

    const where: any = {};

    // If student, can only see own conducts
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
    
    if (termId) where.termId = String(termId);

    const conducts = await prisma.conduct.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { name: true } }
          }
        },
        term: {
            select: {
                id: true,
                name: true
            }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(conducts);
  } catch (error) {
    console.error("Error fetching conducts:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateConduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { appreciation, comment } = req.body;

        const conduct = await prisma.conduct.update({
            where: { id },
            data: { appreciation, comment }
        });

        res.json(conduct);
    } catch (error) {
        console.error("Error updating conduct:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

export const deleteConduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.conduct.delete({ where: { id } });
        res.json({ message: "Conduct deleted" });
    } catch (error) {
        console.error("Error deleting conduct:", error);
        res.status(500).json({ message: "Server error", error });
    }
};
