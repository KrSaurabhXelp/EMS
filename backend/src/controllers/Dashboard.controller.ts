import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Employees } from "../entities/Employees";
import { Tasks } from "../entities/Tasks";

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const employeeRepo = AppDataSource.getRepository(Employees);
        const taskRepo = AppDataSource.getRepository(Tasks);

        const [
            totalEmployees,
            totalTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks,
            recentEmployees,
            recentTasks,
        ] = await Promise.all([
            employeeRepo.count(),
            taskRepo.count(),
            taskRepo.countBy({ status: "Pending" }),
            taskRepo.countBy({ status: "In Progress" }),
            taskRepo.countBy({ status: "Completed" }),
            employeeRepo.find({
                order: { employeeId: "DESC" },
                take: 5,
                relations: { designation: true },
            }),
            taskRepo.find({
                order: { id: "DESC" },
                take: 5,
                relations: { employee: true },
            }),
        ]);

        const formattedEmployees = recentEmployees.map((e) => ({
            id: e.employeeId,
            code: String(e.employeeCode),
            name: e.employeeName,
            designation: e.designation?.name || "N/A",
            email: e.employeeEmail,
            mobile: e.employeeMobile,
            status: e.employeeStatus ? "Active" : "Inactive",
        }));

        const formattedTasks = recentTasks.map((t) => ({
            id: t.id,
            code: String(t.taskCode),
            title: t.taskTitle,
            description: t.taskDescription,
            assignedTo: t.employee?.employeeName || "Unassigned",
            priority: t.priority,
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
            status: t.status,
        }));

        res.status(200).json({
            counts: {
                employees: totalEmployees,
                totalTasks,
                pending: pendingTasks,
                inProgress: inProgressTasks,
                completed: completedTasks,
            },
            recentEmployees: formattedEmployees,
            recentTasks: formattedTasks,
        });
    } catch (error: any) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats", error: error?.message || String(error) });
    }
};
