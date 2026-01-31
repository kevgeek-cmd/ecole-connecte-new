/**
 * Contrôleur pour la gestion de l'authentification.
 * Gère l'inscription, la connexion et la génération des tokens JWT.
 */
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { z } from "zod";

// Schéma de validation pour l'inscription d'un utilisateur
const registerSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.enum(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"]).optional(),
});

// Schéma de validation pour la connexion
const loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

/**
 * Enregistre un nouvel utilisateur (principalement utilisé pour les élèves par défaut).
 */
export const register = async (req: Request, res: Response) => {
  try {
    // Validation des données entrantes avec Zod
    const { email, password, firstName, lastName, role } = registerSchema.parse(req.body);

    // Vérification si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà" });
    }

    // Cryptage du mot de passe avec Bcrypt (10 rounds de salage)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur dans la base de données
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "STUDENT", // Rôle par défaut : Elève
      },
    });

    res.status(201).json({ 
      message: "Utilisateur créé avec succès", 
      user: { id: user.id, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription", error });
  }
};

/**
 * Connecte un utilisateur et génère un token JWT.
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Validation des données de connexion
    const { email, password } = loginSchema.parse(req.body);

    // Recherche de l'utilisateur et inclusion de son école
    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true }
    });

    if (!user) {
      return res.status(400).json({ message: "Identifiants invalides" });
    }

    // Vérification si l'école est active (sauf pour le Super Admin)
    if (user.school && !user.school.isActive && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        message: "L'accès à cette école a été suspendu. Veuillez contacter l'administrateur." 
      });
    }

    // Comparaison du mot de passe saisi avec le mot de passe crypté en base
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Identifiants invalides" });
    }

    // Génération du token JWT (valable 1 jour)
    const token = jwt.sign(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      process.env.JWT_SECRET || "secret_par_defaut_a_changer",
      { expiresIn: "1d" }
    );

    // Retour des informations utilisateur et du token au client
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        schoolId: user.schoolId 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la connexion", error });
  }
};
