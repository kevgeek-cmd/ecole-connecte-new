import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { 
    createQuiz, 
    getQuizzes, 
    getQuiz, 
    submitQuizAttempt, 
    getMyAttempts 
} from "../controllers/quiz.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["TEACHER"]), createQuiz);
router.get("/", getQuizzes); // Filter by courseId in query
router.get("/attempts", authorize(["STUDENT"]), getMyAttempts);
router.get("/:id", getQuiz);
router.post("/:id/submit", authorize(["STUDENT"]), submitQuizAttempt);

export default router;
