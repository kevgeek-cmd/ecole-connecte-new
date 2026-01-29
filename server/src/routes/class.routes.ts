import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createClass,
  getClasses,
  enrollStudent,
  getClassStudents,
  deleteClass,
  importStudents,
  updateClass,
  transferStudent,
  previewImportStudents
} from "../controllers/class.controller.js";

const router = Router();

router.use(authenticate);

// Only Admins can create classes and enroll students
router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), createClass);
router.put("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), updateClass);
router.post("/enroll", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN"]), enrollStudent);
router.post("/transfer", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), transferStudent);
router.post("/:id/students/import", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), upload.single('file'), importStudents);
router.post("/:id/students/import-preview", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), upload.single('file'), previewImportStudents);
router.delete("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), deleteClass);

// Teachers and Students can view classes (Students only their own, implemented in filtering logic ideally)
// For now, let's allow all authenticated users to view classes (filtering by school is done in controller)
router.get("/", getClasses);
router.get("/:id/students", getClassStudents);

export default router;
