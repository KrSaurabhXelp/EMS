import { Router } from "express";
import {
  createDesignation,
  deleteDesignation,
  getAllDesignations,
  getDesignationsById,
  updateDesignation,
} from "../controllers/Designations.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbc.middleware";

const router = Router();

// Viewing designations is allowed for all logged-in roles
router.get("/designations", authenticateToken, getAllDesignations);
router.get("/designations/:id", authenticateToken, getDesignationsById);

// Only ADMIN can create, update, or delete designations (HR and regular users cannot)
router.post("/designations", authenticateToken, authorize("admin"), createDesignation);
router.put("/designations/:id", authenticateToken, authorize("admin"), updateDesignation);
router.delete("/designations/:id", authenticateToken, authorize("admin"), deleteDesignation);

export default router;