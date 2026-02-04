
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getStudentReportCard, getClassReportCard } from "../controllers/report-card.controller.js";

const router = Router();

router.use(authenticate);

// Get specific student report (Student sees own, Admin/Teacher sees any)
router.get("/student/:studentId", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT", "IT_ADMIN"]), getStudentReportCard);

// Get global class report (School Admin/Teacher)
router.get("/class/:classId", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN"]), getClassReportCard);

export default router;
