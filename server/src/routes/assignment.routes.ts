import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createAssignment,
  getAssignments,
  getAgenda,
  getAssignmentById,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
  deleteAssignment,
} from "../controllers/assignment.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), upload.single('file'), createAssignment);
router.get("/agenda", getAgenda); // Must be before /:id
router.get("/", getAssignments);
router.get("/:id", getAssignmentById);
router.delete("/:id", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), deleteAssignment);

// Student submits
router.post("/:id/submit", authorize(["STUDENT"]), upload.single('file'), submitAssignment);

// Teacher/Admin views submissions and grades
router.get("/:id/submissions", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), getSubmissions);
router.post("/submissions/:id/grade", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), gradeSubmission);

export default router;
