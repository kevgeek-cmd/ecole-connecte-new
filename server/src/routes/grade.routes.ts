import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getGradebook, saveGrade, getStudentReportCard } from "../controllers/grade.controller.js";

const router = Router();

router.use(authenticate);

// Get student report card (bulletin)
router.get("/report-card/:studentId?", authorize(["STUDENT", "TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN"]), getStudentReportCard);

// Get gradebook for a course
router.get("/:courseId/gradebook", authorize(["TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN"]), getGradebook);

// Save or update a grade
router.post("/save", authorize(["TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN"]), saveGrade);

export default router;
