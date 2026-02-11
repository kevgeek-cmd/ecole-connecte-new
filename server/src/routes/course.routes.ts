import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createCourse,
  getCourses,
  getCourse,
  addMaterial,
  deleteMaterial,
  getMaterials,
  deleteCourse,
  getLibrary,
  createChapter,
  getCourseChapters
} from "../controllers/course.controller.js";

const router = Router();

router.use(authenticate);

router.get("/library", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "STUDENT", "EDUCATOR"]), getLibrary); // Specific route first
router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "EDUCATOR"]), createCourse);
router.get("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "STUDENT", "EDUCATOR"]), getCourses);
router.get("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "STUDENT", "EDUCATOR"]), getCourse);
router.delete("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "EDUCATOR"]), deleteCourse);

// Chapters
router.post("/:courseId/chapters", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), createChapter);
router.get("/:id/content", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "STUDENT", "EDUCATOR"]), getCourseChapters);

// Material routes nested under course
router.post("/:id/materials", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), upload.single('file'), addMaterial);
router.get("/:id/materials", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "STUDENT", "EDUCATOR"]), getMaterials);
router.delete("/materials/:id", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), deleteMaterial);

export default router;
