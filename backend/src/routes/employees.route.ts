import { Router } from "express";
import {
  createEmployees,
  deleteEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
} from "../controllers/Employees.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbc.middleware";

const router = Router();

// Everyone logged in can view employees
router.get("/employees", authenticateToken, getAllEmployees);
router.get("/employees/:id", authenticateToken, getEmployeeById);

// Only Admin can create employees
router.post("/employees", authenticateToken, authorize("admin"), createEmployees);

// Update: Admin and HR can update; Employees can only update their own record (checked in controller)
router.put("/employees/:id", authenticateToken, updateEmployee);

// Delete: Only Admin can delete employees
router.delete("/employees/:id", authenticateToken, authorize("admin"), deleteEmployee);

export default router;

