import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z
    .enum(["admin", "hr", "user", "employee"])
    .optional()
    .default("user"),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email or Employee ID is required"),
  password: z.string().min(1, "Password is required"),
});

