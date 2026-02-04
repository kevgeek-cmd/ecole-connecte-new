/**
 * Point d'entrée principal de l'application Express.
 * Configure les middlewares, les routes et la politique de sécurité.
 */
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

// Importation des routes
import authRoutes from "./routes/auth.routes.js";
import schoolRoutes from "./routes/school.routes.js";
import userRoutes from "./routes/user.routes.js";
import academicRoutes from "./routes/academic.routes.js";
import classRoutes from "./routes/class.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import courseRoutes from "./routes/course.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import gradeRoutes from "./routes/grade.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import reportCardRoutes from "./routes/report-card.routes.js";

// Chargement des variables d'environnement
dotenv.config();

const app = express();

// --- Configuration des Middlewares ---

// Configuration de CORS : Autorise les requêtes provenant du frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://ecole-connecte-client.vercel.app'] 
    : true, // En développement, on autorise tout (ou strictement localhost)
  credentials: true
}));

// Sécurisation des headers HTTP avec Helmet
app.use((helmet as any)({ crossOriginResourcePolicy: false }));

// Journalisation des requêtes HTTP en mode développement
app.use(morgan("dev"));

// Analyse du corps des requêtes en format JSON
app.use(express.json());

// --- Gestion des fichiers statiques ---
// Note : Pour Vercel, les fichiers locaux ne persistent pas. 
// La migration vers Supabase Storage est privilégiée pour la production.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- Définition des Routes API ---
app.use("/api/auth", authRoutes);           // Authentification (Login, Register)
app.use("/api/schools", schoolRoutes);     // Gestion des écoles
app.use("/api/users", userRoutes);         // Gestion des utilisateurs
app.use("/api/academic", academicRoutes);   // Années scolaires et trimestres
app.use("/api/classes", classRoutes);       // Classes et inscriptions
app.use("/api/subjects", subjectRoutes);   // Matières
app.use("/api/courses", courseRoutes);     // Cours et supports
app.use("/api/assignments", assignmentRoutes); // Devoirs et soumissions
app.use("/api/dashboard", dashboardRoutes); // Statistiques du tableau de bord
app.use("/api/grades", gradeRoutes);       // Notes et bulletins
app.use("/api/notifications", notificationRoutes); // Notifications et annonces
app.use("/api/chat", chatRoutes);           // Messagerie instantanée
app.use("/api/quizzes", quizRoutes);       // Quiz et évaluations
app.use("/api/report-cards", reportCardRoutes); // Bulletins scolaires

// Route de test pour vérifier que l'API est en ligne
app.get("/", (req, res) => {
  res.json({ message: "API Ecole Connectée is running" });
});

export default app;
