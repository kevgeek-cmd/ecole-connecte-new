import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"]),
  schoolId: z.string().optional(),
});

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, schoolId } = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        schoolId: schoolId || null,
      },
    });

    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, schoolId } = req.query;
    const currentUser = req.user;

    const whereClause: any = {};

    // Filter by role if provided
    if (role) whereClause.role = role;
    // Filter by schoolId if provided
    if (schoolId) whereClause.schoolId = schoolId;

    // RBAC: Strict filtering based on current user role
    if (currentUser?.role === 'SCHOOL_ADMIN') {
        // School Admin can ONLY see users from their own school
        if (!currentUser.schoolId) {
            return res.status(400).json({ message: "Admin has no school assigned" });
        }
        whereClause.schoolId = currentUser.schoolId;
        
        // Exclude SUPER_ADMIN (just in case)
        whereClause.role = { not: 'SUPER_ADMIN' };
    } else if (currentUser?.role === 'SUPER_ADMIN') {
        // Super Admin can see everyone
        // If schoolId query param is provided, it's already in whereClause
    } else {
        // Other roles shouldn't be accessing this endpoint generally, or limited to public info
        // For now, let's restrict to same school if they do access it
        if (currentUser?.schoolId) {
             whereClause.schoolId = currentUser.schoolId;
        }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        school: {
          select: {
            id: true,
            name: true,
          }
        },
        enrollments: {
            include: {
                class: true
            }
        }
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, schoolId } = req.body; // Allow partial updates without password

    if (!id) return res.status(400).json({ message: "Missing id" });

    // Optional: Validate data if needed, or use Zod with .partial()
    
    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: {
        email,
        firstName,
        lastName,
        role,
        schoolId: schoolId || undefined, // undefined to ignore if not provided/null handling
      },
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Missing id" });

    await prisma.user.delete({
      where: { id: String(id) },
    });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};
