import { Router } from "express";
import { getDashboardStats } from "../controllers/Dashboard.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get("/dashboard/stats", authenticateToken, getDashboardStats);

export default router;
