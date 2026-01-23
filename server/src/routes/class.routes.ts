import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createClass,
  getClasses,
  enrollStudent,
  getClassStudents,
  deleteClass,
  importStudents
} from "../controllers/class.controller.js";

const router = Router();

router.use(authenticate);

// Only Admins can create classes and enroll students
router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), createClass);
router.post("/enroll", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]), enrollStudent);
router.post("/:id/students/import", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), upload.single('file'), importStudents);
router.delete("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), deleteClass);

// Teachers and Students can view classes (Students only their own, implemented in filtering logic ideally)
// For now, let's allow all authenticated users to view classes (filtering by school is done in controller)
router.get("/", getClasses);
router.get("/:id/students", getClassStudents);

export default router;
