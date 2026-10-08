import { Router } from "express";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
} from "../controllers/Tasks.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbc.middleware";

const router = Router();

// Viewing tasks is allowed for all logged-in roles
router.get("/tasks", authenticateToken, getAllTasks);
router.get("/tasks/:id", authenticateToken, getTaskById);

// Create tasks: only Admin and HR can create tasks (Regular user/employee CANNOT create tasks)
router.post("/tasks", authenticateToken, authorize("admin", "hr"), createTask);
router.put("/tasks/:id", authenticateToken, updateTask);

// Delete task: only Admin and HR can delete tasks (Regular user/employee CANNOT delete tasks)
router.delete("/tasks/:id", authenticateToken, authorize("admin", "hr"), deleteTask);

export default router;

