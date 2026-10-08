import { z } from "zod";

export const taskIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "Invalid task ID, must be a number")
    .transform((val) => parseInt(val, 10)),
});

export const createTaskSchema = z
  .object({
    taskCode: z.union([z.number(), z.string()]).optional(),
    code: z.union([z.number(), z.string()]).optional(),
    taskTitle: z.string().trim().optional(),
    title: z.string().trim().optional(),
    taskDescription: z.string().trim().optional(),
    description: z.string().trim().optional(),
    employeeId: z.union([z.number(), z.string()]).optional(),
    assignedTo: z.union([z.number(), z.string()]).optional(),
    priority: z.string().trim().min(1, "Priority is required"),
    dueDate: z.union([z.string(), z.date()]),
    status: z.string().trim().min(1, "Status is required"),
  })
  .refine(
    (data) => {
      const code = data.taskCode ?? data.code;
      return code !== undefined && !isNaN(Number(code));
    },
    { message: "Valid task code is required", path: ["taskCode"] }
  )
  .refine(
    (data) => {
      const title = (data.taskTitle ?? data.title)?.trim();
      return Boolean(title && title.length > 0);
    },
    { message: "Task title is required", path: ["taskTitle"] }
  )
  .refine(
    (data) => {
      const empId = data.employeeId ?? data.assignedTo;
      return empId !== undefined && !isNaN(Number(empId));
    },
    { message: "Valid employee ID is required", path: ["employeeId"] }
  )
  .refine(
    (data) => {
      const d = new Date(data.dueDate);
      return !isNaN(d.getTime());
    },
    { message: "Valid due date is required", path: ["dueDate"] }
  )
  .transform((data) => {
    const taskCode = Number(data.taskCode ?? data.code);
    const taskTitle = (data.taskTitle ?? data.title)!.trim();
    const taskDescription = (data.taskDescription ?? data.description ?? "").trim();
    const employeeId = Number(data.employeeId ?? data.assignedTo);
    const dueDate = new Date(data.dueDate);

    return {
      taskCode,
      taskTitle,
      taskDescription,
      employeeId,
      priority: data.priority,
      dueDate,
      status: data.status,
    };
  });

export const updateTaskStatusOnlySchema = z.object({
  status: z.string().trim().min(1, "Status is required"),
});

export const updateTaskSchema = createTaskSchema;
