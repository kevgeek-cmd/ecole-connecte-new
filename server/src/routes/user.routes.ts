import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createUser, getUsers } from "../controllers/user.controller.js";

const router = Router();

// SUPER_ADMIN can manage all users
// SCHOOL_ADMIN can manage teachers and students in their school (will implement middleware check later)
router.use(authenticate);

router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), createUser);
router.get("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), getUsers);

export default router;
