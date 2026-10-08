import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Employees } from "../entities/Employees";
import { Tasks } from "../entities/Tasks";
import {
    createTaskSchema,
    taskIdParamSchema,
    updateTaskSchema,
    updateTaskStatusOnlySchema,
} from "../validators/task.validator";
import { formatZodErrors, getFirstErrorMessage } from "../middleware/validate.middleware";
import { createAndSendNotification } from "./notification.controller";

export const createTask = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        if (currentUser && (currentUser.role === "user" || currentUser.role === "employee")) {
            res.status(403).json({ 
                message: "Forbidden: Regular employees/users are not authorized to create tasks." 
            });
            return;
        }

        const validation = createTaskSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(validation.error, "Invalid task data"),
                errors: formatZodErrors(validation.error),
            });
            return;
        }

        const { taskCode, taskTitle, taskDescription, employeeId, priority, dueDate, status } = validation.data;

        const employeeRepository = AppDataSource.getRepository(Employees);
        const employee = await employeeRepository.findOneBy({ employeeId });

        if (!employee) {
            res.status(404).json({ message: "Employee not found" });
            return;
        }

        const taskRepository = AppDataSource.getRepository(Tasks);
        const task = taskRepository.create({
            taskCode,
            taskTitle,
            taskDescription,
            employee,
            priority,
            dueDate,
            status,
        });

        const savedTask = await taskRepository.save(task);

        const isHr = currentUser?.role === "hr";
        const actorName = currentUser?.name || (isHr ? "HR" : "Admin");

        if (isHr) {
            // 1. HR created task -> notify Admin
            createAndSendNotification({
                title: "Task Created by HR 📋",
                message: `HR ${actorName} created task #${taskCode}: "${taskTitle}" and assigned it to ${employee.employeeName}.`,
                type: "task_assigned",
                forRole: "admin",
                senderId: currentUser?.id,
                metadata: {
                    taskId: savedTask.id,
                    taskCode: savedTask.taskCode,
                    taskTitle: savedTask.taskTitle,
                    priority: savedTask.priority,
                    employeeName: employee.employeeName,
                },
            }).catch((err) => console.error("Admin notification error:", err));

            // 2. Notify assigned Employee
            createAndSendNotification({
                title: "New Task Assigned! 📋",
                message: `HR ${actorName} assigned task #${taskCode}: "${taskTitle}" (${priority} priority) to you.`,
                type: "task_assigned",
                employeeId: employee.employeeId,
                senderId: currentUser?.id,
                metadata: {
                    taskId: savedTask.id,
                    taskCode: savedTask.taskCode,
                    taskTitle: savedTask.taskTitle,
                    priority: savedTask.priority,
                },
            }).catch((err) => console.error("Employee notification error:", err));
        } else {
            // Admin created task
            // 1. Notify assigned Employee
            createAndSendNotification({
                title: "New Task Assigned! 📋",
                message: `Admin assigned task #${taskCode}: "${taskTitle}" (${priority} priority) to you.`,
                type: "task_assigned",
                employeeId: employee.employeeId,
                senderId: currentUser?.id,
                metadata: {
                    taskId: savedTask.id,
                    taskCode: savedTask.taskCode,
                    taskTitle: savedTask.taskTitle,
                    priority: savedTask.priority,
                },
            }).catch((err) => console.error("Employee notification error:", err));

            // 2. Notify HR
            createAndSendNotification({
                title: "Task Assigned by Admin 📋",
                message: `Admin assigned task #${taskCode}: "${taskTitle}" (${priority} priority) to ${employee.employeeName}.`,
                type: "task_assigned",
                forRole: "hr",
                senderId: currentUser?.id,
                metadata: {
                    taskId: savedTask.id,
                    taskCode: savedTask.taskCode,
                    taskTitle: savedTask.taskTitle,
                    priority: savedTask.priority,
                    employeeName: employee.employeeName,
                },
            }).catch((err) => console.error("HR notification error:", err));
        }

        res.status(201).json(savedTask);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllTasks = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        const taskRepository = AppDataSource.getRepository(Tasks);

        if (currentUser && (currentUser.role === "employee" || currentUser.role === "user")) {
            const employeeRepo = AppDataSource.getRepository(Employees);
            const emp = await employeeRepo.findOne({
                where: { employeeEmail: currentUser.email },
            });
            if (!emp) {
                return res.status(200).json([]);
            }
            const tasks = await taskRepository.find({
                where: { employee: { employeeId: emp.employeeId } },
                relations: { employee: true },
            });
            return res.status(200).json(tasks);
        }

        const tasks = await taskRepository.find({ relations: { employee: true } });
        res.status(200).json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getTaskById = async (req: Request, res: Response) => {
    try {
        const paramValidation = taskIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid task ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const { id: taskId } = paramValidation.data;
        const taskRepository = AppDataSource.getRepository(Tasks);
        const task = await taskRepository.findOne({
            where: { id: taskId },
            relations: { employee: true },
        });

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        res.status(200).json(task);
    } catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        const paramValidation = taskIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid task ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const { id: taskId } = paramValidation.data;
        const taskRepository = AppDataSource.getRepository(Tasks);
        const task = await taskRepository.findOne({
            where: { id: taskId },
            relations: { employee: true },
        });

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        const currentUser = (req as any).user;
        const isRegularUser = currentUser && (currentUser.role === "user" || currentUser.role === "employee");
        const isHr = currentUser?.role === "hr";
        const actorName = currentUser?.name || (isHr ? "HR" : "Admin");

        // Regular employee/user can ONLY change the status of their own assigned task
        if (isRegularUser) {
            const userEmail = currentUser?.email?.toLowerCase();
            const userName = currentUser?.name?.toLowerCase();
            const empEmail = task.employee?.employeeEmail?.toLowerCase();
            const assignedEmpName = task.employee?.employeeName?.toLowerCase();

            const isAssignedToCurrentUser =
                Boolean(task.employee &&
                ((userEmail && empEmail && userEmail === empEmail) ||
                 (userName && assignedEmpName && userName === assignedEmpName)));

            if (!isAssignedToCurrentUser) {
                res.status(403).json({
                    message: "Forbidden: You can only edit tasks assigned to you. Other tasks are view-only.",
                });
                return;
            }

            const statusValidation = updateTaskStatusOnlySchema.safeParse(req.body);
            if (!statusValidation.success) {
                res.status(400).json({
                    message: getFirstErrorMessage(statusValidation.error, "Status is required"),
                    errors: formatZodErrors(statusValidation.error),
                });
                return;
            }

            const previousStatus = task.status;
            const newStatus = statusValidation.data.status;
            task.status = newStatus;
            const updatedTask = await taskRepository.save(task);

            const empName = task.employee?.employeeName || currentUser?.name || "Employee";

            // Rule: When user/employee does any action -> notify Admin AND HR!
            if (newStatus?.toLowerCase() === "completed" && previousStatus?.toLowerCase() !== "completed") {
                createAndSendNotification({
                    title: "Task Completed! ✅",
                    message: `${empName} completed task #${task.taskCode}: "${task.taskTitle}".`,
                    type: "task_completed",
                    forRole: "admin_and_hr",
                    senderId: currentUser?.id,
                    metadata: {
                        taskId: task.id,
                        taskCode: task.taskCode,
                        taskTitle: task.taskTitle,
                        employeeName: empName,
                    },
                }).catch((err) => console.error("Error sending completed notification:", err));
            } else if (newStatus !== previousStatus) {
                createAndSendNotification({
                    title: "Task Status Updated 🔄",
                    message: `${empName} updated task #${task.taskCode}: "${task.taskTitle}" status to "${newStatus}".`,
                    type: "task_updated",
                    forRole: "admin_and_hr",
                    senderId: currentUser?.id,
                    metadata: {
                        taskId: task.id,
                        taskCode: task.taskCode,
                        taskTitle: task.taskTitle,
                        employeeName: empName,
                        newStatus,
                    },
                }).catch((err) => console.error("Error sending status update notification:", err));
            }

            res.status(200).json(updatedTask);
            return;
        }

        // Admin and HR can update all fields
        const bodyValidation = updateTaskSchema.safeParse(req.body);
        if (!bodyValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(bodyValidation.error, "Invalid task data"),
                errors: formatZodErrors(bodyValidation.error),
            });
            return;
        }

        const { taskCode, taskTitle, taskDescription, employeeId, priority, dueDate, status } = bodyValidation.data;

        const employeeRepository = AppDataSource.getRepository(Employees);
        const employee = await employeeRepository.findOneBy({ employeeId });

        if (!employee) {
            res.status(404).json({ message: "Employee not found" });
            return;
        }

        const previousStatus = task.status;
        const previousEmployeeId = task.employee?.employeeId;

        task.taskCode = taskCode;
        task.taskTitle = taskTitle;
        task.taskDescription = taskDescription;
        task.employee = employee;
        task.priority = priority;
        task.dueDate = dueDate;
        task.status = status;

        const updatedTask = await taskRepository.save(task);

        if (isHr) {
            // Rule: When HR does action -> notify Admin
            createAndSendNotification({
                title: "Task Updated by HR 📝",
                message: `HR ${actorName} updated task #${taskCode}: "${taskTitle}".`,
                type: "task_updated",
                forRole: "admin",
                senderId: currentUser?.id,
                metadata: {
                    taskId: updatedTask.id,
                    taskCode: updatedTask.taskCode,
                    taskTitle: updatedTask.taskTitle,
                },
            }).catch((err) => console.error("Admin notification error:", err));

            // Notify the assigned employee about their task update
            createAndSendNotification({
                title: previousEmployeeId !== employee.employeeId ? "New Task Assigned! 📋" : "Task Updated by HR 📝",
                message: previousEmployeeId !== employee.employeeId
                    ? `HR ${actorName} assigned task #${taskCode}: "${taskTitle}" (${priority} priority) to you.`
                    : `HR ${actorName} updated details for your task #${taskCode}: "${taskTitle}".`,
                type: previousEmployeeId !== employee.employeeId ? "task_assigned" : "task_updated",
                employeeId: employee.employeeId,
                senderId: currentUser?.id,
                metadata: {
                    taskId: updatedTask.id,
                    taskCode: updatedTask.taskCode,
                    taskTitle: updatedTask.taskTitle,
                },
            }).catch((err) => console.error("Employee notification error:", err));
        } else {
            // Admin updated task -> notify HR
            createAndSendNotification({
                title: "Task Updated by Admin 📝",
                message: `Admin updated task #${taskCode}: "${taskTitle}".`,
                type: "task_updated",
                forRole: "hr",
                senderId: currentUser?.id,
                metadata: {
                    taskId: updatedTask.id,
                    taskCode: updatedTask.taskCode,
                    taskTitle: updatedTask.taskTitle,
                },
            }).catch((err) => console.error("HR notification error:", err));

            // Notify the assigned employee about their task update
            createAndSendNotification({
                title: previousEmployeeId !== employee.employeeId ? "New Task Assigned! 📋" : "Task Updated by Admin 📝",
                message: previousEmployeeId !== employee.employeeId
                    ? `Admin assigned task #${taskCode}: "${taskTitle}" (${priority} priority) to you.`
                    : `Admin updated details for your task #${taskCode}: "${taskTitle}".`,
                type: previousEmployeeId !== employee.employeeId ? "task_assigned" : "task_updated",
                employeeId: employee.employeeId,
                senderId: currentUser?.id,
                metadata: {
                    taskId: updatedTask.id,
                    taskCode: updatedTask.taskCode,
                    taskTitle: updatedTask.taskTitle,
                },
            }).catch((err) => console.error("Employee notification error:", err));
        }

        res.status(200).json(updatedTask);
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        if (currentUser && (currentUser.role === "user" || currentUser.role === "employee")) {
            res.status(403).json({ 
                message: "Forbidden: Regular users/employees are not authorized to delete tasks." 
            });
            return;
        }

        const paramValidation = taskIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid task ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const { id: taskId } = paramValidation.data;
        const taskRepository = AppDataSource.getRepository(Tasks);
        const task = await taskRepository.findOne({
            where: { id: taskId },
            relations: { employee: true },
        });

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        const isHr = currentUser?.role === "hr";
        const actorName = currentUser?.name || (isHr ? "HR" : "Admin");
        const assignedEmpId = task.employee?.employeeId;

        await taskRepository.remove(task);

        if (isHr) {
            // Rule: When HR does action -> notify Admin
            createAndSendNotification({
                title: "Task Deleted by HR 🗑️",
                message: `HR ${actorName} deleted task #${task.taskCode}: "${task.taskTitle}".`,
                type: "task_deleted",
                forRole: "admin",
                senderId: currentUser?.id,
                metadata: {
                    taskId: task.id,
                    taskCode: task.taskCode,
                    taskTitle: task.taskTitle,
                },
            }).catch((err) => console.error("Admin notification error:", err));

            // If task was assigned to an employee -> notify that employee
            if (assignedEmpId) {
                createAndSendNotification({
                    title: "Task Removed ⚠️",
                    message: `Task #${task.taskCode}: "${task.taskTitle}" was removed by HR.`,
                    type: "task_deleted",
                    employeeId: assignedEmpId,
                    senderId: currentUser?.id,
                    metadata: {
                        taskId: task.id,
                        taskCode: task.taskCode,
                        taskTitle: task.taskTitle,
                    },
                }).catch((err) => console.error("Employee notification error:", err));
            }
        } else {
            // Admin deleted task -> notify HR
            createAndSendNotification({
                title: "Task Deleted by Admin 🗑️",
                message: `Admin deleted task #${task.taskCode}: "${task.taskTitle}".`,
                type: "task_deleted",
                forRole: "hr",
                senderId: currentUser?.id,
                metadata: {
                    taskId: task.id,
                    taskCode: task.taskCode,
                    taskTitle: task.taskTitle,
                },
            }).catch((err) => console.error("HR notification error:", err));

            // If task was assigned to an employee -> notify that employee
            if (assignedEmpId) {
                createAndSendNotification({
                    title: "Task Removed ⚠️",
                    message: `Task #${task.taskCode}: "${task.taskTitle}" was removed by Admin.`,
                    type: "task_deleted",
                    employeeId: assignedEmpId,
                    senderId: currentUser?.id,
                    metadata: {
                        taskId: task.id,
                        taskCode: task.taskCode,
                        taskTitle: task.taskTitle,
                    },
                }).catch((err) => console.error("Employee notification error:", err));
            }
        }

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
