import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/data-source";
import { Designation } from "../entities/Designations";
import { Employees } from "../entities/Employees";
import { Tasks } from "../entities/Tasks";
import { User } from "../entities/User";
import {
    createEmployeeSchema,
    employeeIdParamSchema,
    updateEmployeeSchema,
} from "../validators/employee.validator";
import { formatZodErrors, getFirstErrorMessage } from "../middleware/validate.middleware";
import { createAndSendNotification } from "./notification.controller";

export const createEmployees = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        if (!currentUser || currentUser.role !== "admin") {
            res.status(403).json({ message: "Forbidden: Only Admin can add employees." });
            return;
        }

        const validation = createEmployeeSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(validation.error, "Invalid employee data"),
                errors: formatZodErrors(validation.error),
            });
            return;
        }

        const {
            employeeCode,
            employeeName,
            designationId,
            employeeEmail,
            employeeMobile,
            employeeStatus,
            password,
            role,
        } = validation.data;

        const designationRepository = AppDataSource.getRepository(Designation);
        const designation = await designationRepository.findOneBy({ id: designationId });

        if (!designation) {
            res.status(404).json({ message: "Designation not found" });
            return;
        }

        const employeesRepository = AppDataSource.getRepository(Employees);
        const existingEmpCode = await employeesRepository.findOneBy({ employeeCode });
        if (existingEmpCode) {
            res.status(400).json({ message: "Employee code already exists" });
            return;
        }

        const existingEmpEmail = await employeesRepository.findOneBy({ employeeEmail });
        if (existingEmpEmail) {
            res.status(400).json({ message: "Employee with this email already exists" });
            return;
        }

        const userRepository = AppDataSource.getRepository(User);
        const existingUser = await userRepository.findOneBy({ email: employeeEmail });
        if (existingUser) {
            res.status(400).json({ message: "A user account with this email already exists" });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const savedEmployee = await AppDataSource.transaction(async (manager) => {
            const newUser = manager.create(User, {
                name: employeeName,
                email: employeeEmail,
                password: hashedPassword,
                role: (role === "hr" ? "hr" : "employee") as any,
            });
            await manager.save(newUser);

            const newEmployee = manager.create(Employees, {
                employeeCode,
                employeeName,
                designation,
                employeeEmail,
                employeeMobile,
                employeeStatus,
            });
            return await manager.save(newEmployee);
        });

        // Admin created employee -> notify All
        createAndSendNotification({
            title: "New Employee Created by Admin 👥",
            message: `Admin registered new employee: ${employeeName} (Code: ${employeeCode}).`,
            type: "employee_action",
            forRole: "all",
            senderId: currentUser?.id,
            metadata: { employeeId: savedEmployee.employeeId, employeeName, employeeCode },
        }).catch((err) => console.error("HR notification error:", err));

        // Welcome notification to new Employee
        createAndSendNotification({
            title: "Welcome to EMS! 🏢",
            message: `Your employee profile has been registered by Admin. You can log in using your email and password.`,
            type: "employee_action",
            employeeId: savedEmployee.employeeId,
            senderId: currentUser?.id,
        }).catch((err) => console.error("Employee notification error:", err));

        res.status(201).json(savedEmployee);
    } catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllEmployees = async (req: Request, res: Response) => {
    try {
        const employeesRepository = AppDataSource.getRepository(Employees);
        const employees = await employeesRepository.find({ relations: { designation: true } });
        res.status(200).json(employees);
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getEmployeeById = async (req: Request, res: Response) => {
    try {
        const paramValidation = employeeIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid employee ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const { id: employeeId } = paramValidation.data;
        const employeesRepository = AppDataSource.getRepository(Employees);
        const employee = await employeesRepository.findOne({
            where: { employeeId },
            relations: { designation: true },
        });

        if (!employee) {
            res.status(404).json({ message: "Employee not found" });
            return;
        }

        res.status(200).json(employee);
    } catch (error) {
        console.error("Error fetching employee:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const paramValidation = employeeIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid employee ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const bodyValidation = updateEmployeeSchema.safeParse(req.body);
        if (!bodyValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(bodyValidation.error, "Invalid employee data"),
                errors: formatZodErrors(bodyValidation.error),
            });
            return;
        }

        const { id: employeeId } = paramValidation.data;
        const {
            employeeCode,
            employeeName,
            designationId,
            employeeEmail,
            employeeMobile,
            employeeStatus,
            password,
        } = bodyValidation.data;

        const employeesRepository = AppDataSource.getRepository(Employees);
        const employee = await employeesRepository.findOneBy({ employeeId });

        if (!employee) {
            res.status(404).json({ message: "Employee not found" });
            return;
        }

        // Ownership check: regular users can only edit their own profile
        const currentUser = (req as any).user;
        if (currentUser && (currentUser.role === "user" || currentUser.role === "employee")) {
            if (employee.employeeEmail !== currentUser.email) {
                res.status(403).json({ 
                    message: "Forbidden: You are only allowed to edit your own employee profile." 
                });
                return;
            }
        }

        if (employeeCode !== employee.employeeCode) {
            const codeTaken = await employeesRepository.findOneBy({ employeeCode });
            if (codeTaken && codeTaken.employeeId !== employeeId) {
                res.status(400).json({ message: "Employee code is already in use by another employee" });
                return;
            }
        }

        if (employeeEmail !== employee.employeeEmail) {
            const emailTaken = await employeesRepository.findOneBy({ employeeEmail });
            if (emailTaken && emailTaken.employeeId !== employeeId) {
                res.status(400).json({ message: "Employee email is already in use by another employee" });
                return;
            }
        }

        const designationRepository = AppDataSource.getRepository(Designation);
        const designation = await designationRepository.findOneBy({ id: designationId });

        if (!designation) {
            res.status(404).json({ message: "Designation not found" });
            return;
        }

        const oldEmail = employee.employeeEmail;
        employee.employeeCode = employeeCode;
        employee.employeeName = employeeName;
        employee.designation = designation;
        employee.employeeEmail = employeeEmail;
        employee.employeeMobile = employeeMobile;
        employee.employeeStatus = employeeStatus;

        const savedEmployee = await employeesRepository.save(employee);

        // Synchronize linked User account
        try {
            const userRepo = AppDataSource.getRepository(User);
            const linkedUser = await userRepo.findOneBy({ email: oldEmail });
            if (linkedUser) {
                linkedUser.name = employeeName;
                linkedUser.email = employeeEmail;
                if (password) {
                    linkedUser.password = await bcrypt.hash(password, 10);
                }
                await userRepo.save(linkedUser);
            } else if (password) {
                const newUser = userRepo.create({
                    name: employeeName,
                    email: employeeEmail,
                    password: await bcrypt.hash(password, 10),
                    role: "employee",
                });
                await userRepo.save(newUser);
            }
        } catch (uErr) {
            console.error("Error syncing linked user on employee update:", uErr);
        }

        const isRegularUser = currentUser && (currentUser.role === "user" || currentUser.role === "employee");
        const isHr = currentUser?.role === "hr";
        const actorName = currentUser?.name || (isHr ? "HR" : "Admin");

        if (isRegularUser) {
            // Regular user updated their profile -> notify Admin AND HR
            createAndSendNotification({
                title: "Employee Profile Updated 👤",
                message: `${employeeName} updated their profile details.`,
                type: "employee_action",
                forRole: "admin_and_hr",
                senderId: currentUser?.id,
                metadata: { employeeId: savedEmployee.employeeId, employeeName },
            }).catch((err) => console.error("Admin & HR notification error:", err));
        } else if (isHr) {
            // HR updated employee -> notify Admin
            createAndSendNotification({
                title: "Employee Updated by HR 👥",
                message: `HR ${actorName} updated employee details for ${employeeName}.`,
                type: "employee_action",
                forRole: "admin",
                senderId: currentUser?.id,
                metadata: { employeeId: savedEmployee.employeeId, employeeName },
            }).catch((err) => console.error("Admin notification error:", err));

            // Also notify that Employee
            createAndSendNotification({
                title: "Profile Updated by HR 👤",
                message: `Your employee profile details were updated by HR.`,
                type: "employee_action",
                employeeId: savedEmployee.employeeId,
                senderId: currentUser?.id,
            }).catch((err) => console.error("Employee notification error:", err));
        } else {
            // Admin updated employee -> notify HR
            createAndSendNotification({
                title: "Employee Updated by Admin 👥",
                message: `Admin updated employee details for ${employeeName}.`,
                type: "employee_action",
                forRole: "hr",
                senderId: currentUser?.id,
                metadata: { employeeId: savedEmployee.employeeId, employeeName },
            }).catch((err) => console.error("HR notification error:", err));

            // Also notify that Employee
            createAndSendNotification({
                title: "Profile Updated by Admin 👤",
                message: `Your employee profile details were updated by Admin.`,
                type: "employee_action",
                employeeId: savedEmployee.employeeId,
                senderId: currentUser?.id,
            }).catch((err) => console.error("Employee notification error:", err));
        }

        res.status(200).json(savedEmployee);
    } catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteEmployee = async (req: Request, res: Response) => {
    try {
        const paramValidation = employeeIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid employee ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const { id: employeeId } = paramValidation.data;
        const employeesRepository = AppDataSource.getRepository(Employees);
        const employee = await employeesRepository.findOneBy({ employeeId });

        if (!employee) {
            res.status(404).json({ message: "Employee not found" });
            return;
        }

        // Only Admin is authorized to delete employee records
        const currentUser = (req as any).user;
        if (currentUser && currentUser.role !== "admin") {
            res.status(403).json({ 
                message: "Forbidden: Only administrators are authorized to delete employee records." 
            });
            return;
        }

        const empName = employee.employeeName;
        const empEmail = employee.employeeEmail;

        // Unlink any tasks assigned to this employee (foreign key: employeeEmployeeId)
        const taskRepository = AppDataSource.getRepository(Tasks);
        await taskRepository
            .createQueryBuilder()
            .update(Tasks)
            .set({ employee: null as any })
            .where("employeeEmployeeId = :id", { id: employeeId })
            .execute();

        await employeesRepository.remove(employee);

        // Also clean up linked User account if exists
        try {
            const userRepo = AppDataSource.getRepository(User);
            await userRepo.delete({ email: empEmail });
        } catch (uErr) {
            console.error("Failed to delete linked user:", uErr);
        }

        // Notify HR
        createAndSendNotification({
            title: "Employee Deleted by Admin 🗑️",
            message: `Admin deleted employee: ${empName}.`,
            type: "employee_action",
            forRole: "hr",
            senderId: currentUser?.id,
        }).catch((err) => console.error("HR notification error:", err));

        res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
