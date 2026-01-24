import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createYearSchema = z.object({
  name: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
});

const createTermSchema = z.object({
  name: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  academicYearId: z.string(),
});

export const createAcademicYear = async (req: AuthRequest, res: Response) => {
  try {
    const { name, startDate, endDate } = createYearSchema.parse(req.body);
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: "User not associated with a school" });
    }

    const year = await prisma.academicYear.create({
      data: {
        name,
        startDate,
        endDate,
        schoolId,
      },
    });

    res.status(201).json(year);
  } catch (error) {
    res.status(500).json({ message: "Error creating academic year", error });
  }
};

export const getAcademicYears = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "User not associated with a school" });
    }

    const years = await prisma.academicYear.findMany({
      where: { schoolId },
      include: { terms: true },
      orderBy: { startDate: "desc" },
    });

    res.json(years);
  } catch (error) {
    res.status(500).json({ message: "Error fetching academic years", error });
  }
};

export const createTerm = async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate, academicYearId } = createTermSchema.parse(req.body);

    const term = await prisma.term.create({
      data: {
        name,
        startDate,
        endDate,
        academicYearId,
      },
    });

    res.status(201).json(term);
  } catch (error) {
    res.status(500).json({ message: "Error creating term", error });
  }
};

export const toggleTermStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // OPEN or CLOSED

    if (!id) {
        return res.status(400).json({ message: "Term ID is required" });
    }

    const term = await prisma.term.update({
      where: { id: id as string },
      data: { status },
    });

    res.json(term);
  } catch (error) {
    res.status(500).json({ message: "Error updating term status", error });
  }
};

export const updateAcademicYear = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate } = createYearSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "Missing id" });

    const updatedYear = await prisma.academicYear.update({
      where: { id: String(id) },
      data: {
        name,
        startDate,
        endDate,
      },
    });

    res.json(updatedYear);
  } catch (error) {
    res.status(500).json({ message: "Error updating academic year", error });
  }
};

export const deleteAcademicYear = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Missing id" });

    await prisma.academicYear.delete({
      where: { id: String(id) },
    });
    res.status(200).json({ message: "Academic year deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting academic year", error });
  }
};
