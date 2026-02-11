import express from "express";
import { createAbsence, getAbsences, updateAbsence, deleteAbsence } from "../controllers/absence.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.post("/", authorize(["SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), createAbsence);
router.get("/", authorize(["SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR", "TEACHER", "STUDENT"]), getAbsences);
router.put("/:id", authorize(["SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), updateAbsence);
router.delete("/:id", authorize(["SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), deleteAbsence);

export default router;
