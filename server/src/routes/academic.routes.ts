import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createAcademicYear,
  getAcademicYears,
  createTerm,
  toggleTermStatus,
} from "../controllers/academic.controller.js";

const router = Router();

router.use(authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]));

router.post("/years", createAcademicYear);
router.get("/years", getAcademicYears);
router.post("/terms", createTerm);
router.patch("/terms/:id/status", toggleTermStatus);

export default router;
