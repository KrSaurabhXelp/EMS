import { z } from "zod";

export const employeeIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "Invalid employee ID, must be a number")
    .transform((val) => parseInt(val, 10)),
});

export const createEmployeeSchema = z
  .object({
    employeeCode: z.union([z.number(), z.string()]).optional(),
    code: z.union([z.number(), z.string()]).optional(),
    employeeName: z.string().trim().optional(),
    name: z.string().trim().optional(),
    designationId: z.union([z.number(), z.string()]).optional(),
    designation: z.union([z.number(), z.string()]).optional(),
    employeeEmail: z.string().trim().optional(),
    email: z.string().trim().optional(),
    employeeMobile: z.union([z.string(), z.number()]).optional(),
    mobile: z.union([z.string(), z.number()]).optional(),
    employeeStatus: z.union([z.boolean(), z.enum(["Active", "Inactive"])]).optional(),
    status: z.union([z.boolean(), z.enum(["Active", "Inactive"])]).optional(),
    password: z.string().optional(),
    role: z.enum(["admin", "hr", "user", "employee"]).optional(),
  })
  .refine(
    (data) => {
      const code = data.employeeCode ?? data.code;
      return code !== undefined && !isNaN(Number(code));
    },
    { message: "Valid employee code is required", path: ["employeeCode"] }
  )
  .refine(
    (data) => {
      const name = (data.employeeName ?? data.name)?.trim();
      return Boolean(name && name.length > 0);
    },
    { message: "Employee name is required", path: ["employeeName"] }
  )
  .refine(
    (data) => {
      const desig = data.designationId ?? data.designation;
      return desig !== undefined && !isNaN(Number(desig));
    },
    { message: "Valid designation ID is required", path: ["designationId"] }
  )
  .refine(
    (data) => {
      const email = (data.employeeEmail ?? data.email)?.trim();
      return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    },
    { message: "Valid employee email is required", path: ["employeeEmail"] }
  )
  .refine(
    (data) => {
      const mobile = String(data.employeeMobile ?? data.mobile ?? "").trim();
      return mobile.length >= 10;
    },
    { message: "Mobile number must be at least 10 digits", path: ["employeeMobile"] }
  )
  .refine(
    (data) => {
      const pwd = data.password?.trim();
      return Boolean(pwd && pwd.length >= 6);
    },
    { message: "Password is required and must be at least 6 characters", path: ["password"] }
  )
  .transform((data) => {
    const employeeCode = Number(data.employeeCode ?? data.code);
    const employeeName = (data.employeeName ?? data.name)!.trim();
    const designationId = Number(data.designationId ?? data.designation);
    const employeeEmail = (data.employeeEmail ?? data.email)!.trim();
    const employeeMobile = String(data.employeeMobile ?? data.mobile).trim();

    const rawStatus = data.employeeStatus !== undefined ? data.employeeStatus : data.status;
    const employeeStatus =
      rawStatus !== undefined
        ? typeof rawStatus === "boolean"
          ? rawStatus
          : rawStatus === "Active"
        : true;

    return {
      employeeCode,
      employeeName,
      designationId,
      employeeEmail,
      employeeMobile,
      employeeStatus,
      password: data.password!.trim(),
      role: data.role || "employee",
    };
  });

export const updateEmployeeSchema = z
  .object({
    employeeCode: z.union([z.number(), z.string()]).optional(),
    code: z.union([z.number(), z.string()]).optional(),
    employeeName: z.string().trim().optional(),
    name: z.string().trim().optional(),
    designationId: z.union([z.number(), z.string()]).optional(),
    designation: z.union([z.number(), z.string()]).optional(),
    employeeEmail: z.string().trim().optional(),
    email: z.string().trim().optional(),
    employeeMobile: z.union([z.string(), z.number()]).optional(),
    mobile: z.union([z.string(), z.number()]).optional(),
    employeeStatus: z.union([z.boolean(), z.enum(["Active", "Inactive"])]).optional(),
    status: z.union([z.boolean(), z.enum(["Active", "Inactive"])]).optional(),
    password: z.string().optional(),
  })
  .refine(
    (data) => {
      const code = data.employeeCode ?? data.code;
      return code !== undefined && !isNaN(Number(code));
    },
    { message: "Valid employee code is required", path: ["employeeCode"] }
  )
  .refine(
    (data) => {
      const name = (data.employeeName ?? data.name)?.trim();
      return Boolean(name && name.length > 0);
    },
    { message: "Employee name is required", path: ["employeeName"] }
  )
  .refine(
    (data) => {
      const desig = data.designationId ?? data.designation;
      return desig !== undefined && !isNaN(Number(desig));
    },
    { message: "Valid designation ID is required", path: ["designationId"] }
  )
  .refine(
    (data) => {
      const email = (data.employeeEmail ?? data.email)?.trim();
      return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    },
    { message: "Valid employee email is required", path: ["employeeEmail"] }
  )
  .refine(
    (data) => {
      const mobile = String(data.employeeMobile ?? data.mobile ?? "").trim();
      return mobile.length >= 10;
    },
    { message: "Mobile number must be at least 10 digits", path: ["employeeMobile"] }
  )
  .refine(
    (data) => {
      if (data.password && data.password.trim().length > 0) {
        return data.password.trim().length >= 6;
      }
      return true;
    },
    { message: "Password must be at least 6 characters if provided", path: ["password"] }
  )
  .transform((data) => {
    const employeeCode = Number(data.employeeCode ?? data.code);
    const employeeName = (data.employeeName ?? data.name)!.trim();
    const designationId = Number(data.designationId ?? data.designation);
    const employeeEmail = (data.employeeEmail ?? data.email)!.trim();
    const employeeMobile = String(data.employeeMobile ?? data.mobile).trim();

    const rawStatus = data.employeeStatus !== undefined ? data.employeeStatus : data.status;
    const employeeStatus =
      rawStatus !== undefined
        ? typeof rawStatus === "boolean"
          ? rawStatus
          : rawStatus === "Active"
        : true;

    return {
      employeeCode,
      employeeName,
      designationId,
      employeeEmail,
      employeeMobile,
      employeeStatus,
      password: data.password?.trim() ? data.password.trim() : undefined,
    };
  });
