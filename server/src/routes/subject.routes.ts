import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createSubject, getSubjects } from "../controllers/subject.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), createSubject);
router.get("/", getSubjects);

export default router;
