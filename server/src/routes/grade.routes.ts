import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getGradebook, saveGrade, getStudentReportCard } from "../controllers/grade.controller.js";

const router = Router();

router.use(authenticate);

// Get student report card (bulletin) - Self (Student)
router.get("/report-card", authorize(["STUDENT", "TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN", "EDUCATOR", "IT_ADMIN"]), getStudentReportCard);

// Get student report card (bulletin) - Specific Student (Teacher/Admin)
router.get("/report-card/:studentId", authorize(["TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN", "EDUCATOR", "IT_ADMIN"]), getStudentReportCard);

// Get gradebook for a course
router.get("/:courseId/gradebook", authorize(["TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN", "EDUCATOR", "IT_ADMIN"]), getGradebook);

// Save or update a grade
router.post("/save", authorize(["TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN", "EDUCATOR", "IT_ADMIN"]), saveGrade);

export default router;
