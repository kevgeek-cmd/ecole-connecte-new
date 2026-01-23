import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createSubjectSchema = z.object({
  name: z.string(),
  code: z.string().optional(),
});

export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code } = createSubjectSchema.parse(req.body);
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: "User not associated with a school" });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code: code || null,
        schoolId,
      },
    });

    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: "Error creating subject", error });
  }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "User not associated with a school" });
    }

    const subjects = await prisma.subject.findMany({
      where: { schoolId },
    });

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subjects", error });
  }
};
