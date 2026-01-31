/**
 * Définition des routes pour l'authentification.
 * Ces routes permettent aux utilisateurs de se connecter et de s'enregistrer.
 */
import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";

const router = Router();

// Route pour l'inscription d'un nouvel utilisateur
// POST /api/auth/register
router.post("/register", register);

// Route pour la connexion
// POST /api/auth/login
router.post("/login", login);

export default router;
