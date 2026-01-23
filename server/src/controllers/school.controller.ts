import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";

const createSchoolSchema = z.object({
  name: z.string().min(3),
  address: z.string().optional(),
  managerId: z.string().optional(),
});

const updateSchoolSchema = z.object({
  name: z.string().min(3).optional(),
  address: z.string().optional(),
  managerId: z.string().optional(),
});

export const createSchool = async (req: Request, res: Response) => {
  try {
    const { name, address, managerId } = createSchoolSchema.parse(req.body);

    const school = await prisma.school.create({
      data: {
        name,
        address: address || null,
        managerId: managerId || null,
      },
    });

    // If managerId is provided, update the user's role and school
    if (managerId) {
      await prisma.user.update({
        where: { id: managerId },
        data: {
          role: "SCHOOL_ADMIN",
          schoolId: school.id,
        },
      });
    }

    res.status(201).json(school);
  } catch (error) {
    res.status(500).json({ message: "Error creating school", error });
  }
};

export const getSchools = async (req: Request, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { users: true, classes: true },
        },
      },
    });
    res.json(schools);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schools", error });
  }
};

export const getSchoolById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "ID required" });

    const school = await prisma.school.findUnique({
      where: { id: id as string },
      include: {
        manager: true,
        users: true,
        classes: true,
      },
    });

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: "Error fetching school", error });
  }
};

export const updateSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, managerId } = updateSchoolSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID required" });

    const updateData: any = {};
    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (managerId !== undefined) updateData.managerId = managerId;

    const school = await prisma.school.update({
      where: { id: id as string },
      data: updateData,
    });

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: "Error updating school", error });
  }
};

export const deleteSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) return res.status(400).json({ message: "ID required" });

    await prisma.school.delete({
      where: { id: id as string },
    });
    res.json({ message: "School deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting school", error });
  }
};
