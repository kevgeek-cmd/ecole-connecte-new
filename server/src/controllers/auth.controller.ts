import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = registerSchema.parse(req.body);

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
        role: role || "STUDENT",
      },
    });

    res.status(201).json({ message: "User created successfully", user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true }
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if school is active
    if (user.school && !user.school.isActive && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: "L'accès à cette école a été suspendu. Veuillez contacter l'administrateur." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, schoolId: user.schoolId } });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};
