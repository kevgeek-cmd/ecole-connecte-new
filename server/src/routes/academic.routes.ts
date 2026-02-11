import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createAcademicYear,
  getAcademicYears,
  createTerm,
  toggleTermStatus,
  updateAcademicYear,
  deleteAcademicYear,
  updateTerm,
  deleteTerm
} from "../controllers/academic.controller.js";

const router = Router();

router.use(authenticate);

// Public read for authenticated users
router.get("/years", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR", "TEACHER", "STUDENT"]), getAcademicYears);

// Restricted write access
router.use(authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]));

router.post("/years", createAcademicYear);
router.post("/terms", createTerm);
router.put("/terms/:id", updateTerm);
router.delete("/terms/:id", deleteTerm);
router.patch("/terms/:id/status", toggleTermStatus);

export default router;
