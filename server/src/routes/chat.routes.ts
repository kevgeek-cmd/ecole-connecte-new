import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getClassHistory, getPrivateHistory, getContacts } from "../controllers/chat.controller.js";

const router = Router();

router.use(authenticate);

router.get("/history/class/:classId", getClassHistory);
router.get("/history/user/:userId", getPrivateHistory);
router.get("/contacts", getContacts);

export default router;
