import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createUser, getUsers, updateUser, deleteUser } from "../controllers/user.controller.js";

const router = Router();

// SUPER_ADMIN can manage all users
// SCHOOL_ADMIN can manage teachers and students in their school (will implement middleware check later)
router.use(authenticate);

router.post("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), createUser);
router.put("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), updateUser);
router.delete("/:id", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), deleteUser);
router.get("/", authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), getUsers);

export default router;
