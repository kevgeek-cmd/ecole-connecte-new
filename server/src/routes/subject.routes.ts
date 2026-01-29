import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createSubject, getSubjects, updateSubject, deleteSubject } from "../controllers/subject.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), createSubject);
router.put("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), updateSubject);
router.delete("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "IT_ADMIN"]), deleteSubject);
router.get("/", getSubjects);

export default router;
