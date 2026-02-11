import express from "express";
import { createConduct, getConducts, updateConduct, deleteConduct } from "../controllers/conduct.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.post("/", authorize(["SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), createConduct);
router.get("/", authorize(["SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR", "TEACHER", "STUDENT"]), getConducts);
router.put("/:id", authorize(["SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), updateConduct);
router.delete("/:id", authorize(["SCHOOL_ADMIN", "IT_ADMIN", "EDUCATOR"]), deleteConduct);

export default router;
