import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Employees } from "../entities/Employees";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { formatZodErrors, getFirstErrorMessage } from "../middleware/validate.middleware";

const getUserRepository = () => AppDataSource.getRepository(User);

export const register = async (req: Request, res: Response) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                message: getFirstErrorMessage(validation.error, "Validation failed"),
                errors: formatZodErrors(validation.error),
            });
        }

        const { name, email, password, role } = validation.data;
        const userRepository = getUserRepository();

        // Admin limit: Only ONE Admin can be created in the system
        if (role === "admin") {
            const existingAdmin = await userRepository.findOne({ where: { role: "admin" } });
            if (existingAdmin) {
                return res.status(400).json({ 
                    message: "An Admin account already exists. Only one Admin is allowed." 
                });
            }
        }

        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = userRepository.create({
            name,
            email,
            password: hashedPassword,
            role,
        });
        await userRepository.save(user);

        return res.status(201).json({ 
            message: "User registered successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error: any) {
        console.error("Registration Error:", error);
        return res.status(500).json({ 
            message: "Registration Failed",
            error: error?.message || String(error)
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                message: getFirstErrorMessage(validation.error, "Validation failed"),
                errors: formatZodErrors(validation.error),
            });
        }

        const identifier = validation.data.email.trim();
        const { password } = validation.data;
        const userRepository = getUserRepository();
        const employeeRepository = AppDataSource.getRepository(Employees);

        let user = await userRepository.findOne({ where: { email: identifier } });

        // If not found directly by email, check if identifier is Employee Code or ID
        if (!user) {
            let emp = await employeeRepository.findOne({ where: { employeeEmail: identifier } });
            if (!emp && !isNaN(Number(identifier))) {
                emp = await employeeRepository.findOne({
                    where: [
                        { employeeCode: Number(identifier) },
                        { employeeId: Number(identifier) }
                    ]
                });
            }
            if (emp) {
                user = await userRepository.findOne({ where: { email: emp.employeeEmail } });
            }
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Fetch employee details if available
        const emp = await employeeRepository.findOne({
            where: { employeeEmail: user.email },
            relations: { designation: true }
        });

        const jwtSecret = process.env.JWT_SECRET || "your_super_secret_jwt_key_123";
        const token = jwt.sign({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            employeeId: emp?.employeeId,
            employeeCode: emp?.employeeCode,
        }, jwtSecret, {
            expiresIn: "1d"
        });

        return res.status(200).json({ 
            token, 
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                employeeId: emp?.employeeId,
                employeeCode: emp?.employeeCode,
                designation: emp?.designation?.name,
            },
            message: "Logged in successfully" 
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Login Failed" });
    }
};

export const checkAdminExists = async (req: Request, res: Response) => {
    try {
        const userRepository = getUserRepository();
        const admin = await userRepository.findOne({ where: { role: "admin" } });
        return res.status(200).json({ exists: !!admin });
    } catch (error) {
        console.error("Check Admin Exists Error:", error);
        return res.status(500).json({ message: "Failed to check admin status" });
    }
};