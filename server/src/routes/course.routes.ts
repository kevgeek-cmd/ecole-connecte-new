import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createCourse,
  getCourses,
  addMaterial,
  deleteMaterial,
  getMaterials,
  deleteCourse,
} from "../controllers/course.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN"]), createCourse);
router.get("/", getCourses);
router.delete("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "IT_ADMIN"]), deleteCourse);

// Material routes nested under course
router.post("/:id/materials", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN"]), upload.single('file'), addMaterial);
router.get("/:id/materials", getMaterials);
router.delete("/materials/:id", authorize(["TEACHER", "SCHOOL_ADMIN", "IT_ADMIN"]), deleteMaterial);

export default router;
