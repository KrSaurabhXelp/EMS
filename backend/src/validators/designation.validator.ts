import { z } from "zod";

export const designationIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "Invalid designation ID, must be a number")
    .transform((val) => parseInt(val, 10)),
});

export const createDesignationSchema = z
  .object({
    name: z.string().trim().optional(),
    designationName: z.string().trim().optional(),
    description: z.string().trim().optional().default(""),
    designationDescription: z.string().trim().optional(),
    status: z
      .union([z.boolean(), z.enum(["Active", "Inactive"])])
      .optional()
      .default(true),
    designationStatus: z
      .union([z.boolean(), z.enum(["Active", "Inactive"])])
      .optional(),
  })
  .refine(
    (data) =>
      Boolean((data.name && data.name.length > 0) || (data.designationName && data.designationName.length > 0)),
    {
      message: "Designation name is required",
      path: ["name"],
    }
  )
  .transform((data) => {
    const name = (data.name ?? data.designationName)!.trim();
    const description = (data.description || data.designationDescription || "").trim();
    const rawStatus = data.designationStatus !== undefined ? data.designationStatus : data.status;
    const status = typeof rawStatus === "boolean" ? rawStatus : rawStatus === "Active";

    return { name, description, status };
  });

export const updateDesignationSchema = z
  .object({
    name: z.string().trim().optional(),
    designationName: z.string().trim().optional(),
    description: z.string().trim().optional(),
    designationDescription: z.string().trim().optional(),
    status: z
      .union([z.boolean(), z.enum(["Active", "Inactive"])])
      .optional(),
    designationStatus: z
      .union([z.boolean(), z.enum(["Active", "Inactive"])])
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.designationName !== undefined ||
      data.description !== undefined ||
      data.designationDescription !== undefined ||
      data.status !== undefined ||
      data.designationStatus !== undefined,
    {
      message: "At least one field must be provided to update",
    }
  )
  .transform((data) => {
    const rawName = data.name !== undefined ? data.name : data.designationName;
    const rawDesc = data.description !== undefined ? data.description : data.designationDescription;
    const rawStatus = data.designationStatus !== undefined ? data.designationStatus : data.status;

    return {
      name: rawName !== undefined ? rawName.trim() : undefined,
      description: rawDesc !== undefined ? rawDesc.trim() : undefined,
      status: rawStatus !== undefined ? (typeof rawStatus === "boolean" ? rawStatus : rawStatus === "Active") : undefined,
    };
  });

export const designationQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .transform((val) => val?.trim() || ""),
  page: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? Math.max(1, parseInt(val, 10) || 1) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? Math.max(1, parseInt(val, 10) || 10) : undefined)),
});

export const designationStatusQuerySchema = z.object({
  status: z
    .enum(["true", "false", "Active", "Inactive"])
    .transform((val) => val === "true" || val === "Active"),
});
