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

router.get("/library", getLibrary); // Specific route first
router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN"]), createCourse);
router.get("/", getCourses);
router.get("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "STUDENT"]), getCourse);
router.delete("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN"]), deleteCourse);

// Chapters
router.post("/:courseId/chapters", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN"]), createChapter);
router.get("/:id/content", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN", "STUDENT"]), getCourseChapters);

// Material routes nested under course
router.post("/:id/materials", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN"]), upload.single('file'), addMaterial);
router.get("/:id/materials", getMaterials);
router.delete("/materials/:id", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN"]), deleteMaterial);

export default router;
