import { Designation } from "../entities/Designations";
import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { FindManyOptions, Like } from "typeorm";
import {
    createDesignationSchema,
    designationIdParamSchema,
    designationQuerySchema,
    // designationStatusQuerySchema,
    updateDesignationSchema,
} from "../validators/designation.validator";
import { formatZodErrors, getFirstErrorMessage } from "../middleware/validate.middleware";
import { createAndSendNotification } from "./notification.controller";

export const createDesignation = async (req: Request, res: Response) => {
    try {
        const validation = createDesignationSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(validation.error, "Validation failed"),
                errors: formatZodErrors(validation.error),
            });
            return;
        }

        const { name, description, status } = validation.data;

        const designationRepository = AppDataSource.getRepository(Designation);
        const designation = designationRepository.create({
            name,
            description,
            status,
        });
        const savedDesignation = await designationRepository.save(designation);

        const currentUser = (req as any).user;
        const isHr = currentUser?.role === "hr";
        const actorName = currentUser?.name || (isHr ? "HR" : "Admin");

        if (isHr) {
            // HR created designation -> notify Admin
            createAndSendNotification({
                title: "Designation Created by HR 🏷️",
                message: `HR ${actorName} created new designation: "${name}".`,
                type: "designation_action",
                forRole: "admin",
                senderId: currentUser?.id,
            }).catch((err) => console.error("Admin notification error:", err));
        } else {
            // Admin created designation -> notify All
            createAndSendNotification({
                title: "Designation Created by Admin 🏷️",
                message: `Admin created new designation: "${name}".`,
                type: "designation_action",
                forRole: "all",
                senderId: currentUser?.id,
            }).catch((err) => console.error("HR notification error:", err));
        }

        res.status(201).json(savedDesignation);
    } catch (error) {
        console.error("Error creating designation:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllDesignations = async (req: Request, res: Response) => {
    try {
        const queryValidation = designationQuerySchema.safeParse(req.query);
        if (!queryValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(queryValidation.error, "Invalid query parameters"),
                errors: formatZodErrors(queryValidation.error),
            });
            return;
        }

        const { search, page, limit } = queryValidation.data;
        const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
        const currentPage = page ?? 1;
        const currentLimit = limit ?? 10;
        const skip = (currentPage - 1) * currentLimit;

        const designationRepository = AppDataSource.getRepository(Designation);
        const whereConditions: any[] = [];
        if (search) {
            whereConditions.push(
                { name: Like(`%${search}%`) },
                { description: Like(`%${search}%`) }
            );

            const searchAsNumber = parseInt(search, 10);
            if (!isNaN(searchAsNumber)) {
                whereConditions.push({ id: searchAsNumber });
            }
        }

        const findOptions: FindManyOptions<Designation> = {
            order: { id: "ASC" },
        };

        if (whereConditions.length > 0) {
            findOptions.where = whereConditions;
        }

        if (isPaginated) {
            const [data, total] = await designationRepository.findAndCount({
                ...findOptions,
                skip,
                take: currentLimit,
            });

            res.status(200).json({
                data,
                total,
                page: currentPage,
                limit: currentLimit,
                totalPages: Math.ceil(total / currentLimit),
            });
            return;
        }

        const designations = await designationRepository.find(findOptions);
        res.status(200).json(designations);
    } catch (error) {
        console.error("Error fetching designations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getDesignationById = async (req: Request, res: Response) => {
    try {
        const paramValidation = designationIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid designation ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const { id: designationId } = paramValidation.data;
        const designationRepository = AppDataSource.getRepository(Designation);
        const designation = await designationRepository.findOneBy({ id: designationId });

        if (!designation) {
            res.status(404).json({ message: "Designation not found" });
            return;
        }

        res.status(200).json(designation);
    } catch (error) {
        console.error("Error fetching designation:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateDesignation = async (req: Request, res: Response) => {
    try {
        const paramValidation = designationIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid designation ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const bodyValidation = updateDesignationSchema.safeParse(req.body);
        if (!bodyValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(bodyValidation.error, "Validation failed"),
                errors: formatZodErrors(bodyValidation.error),
            });
            return;
        }

        const { id: designationId } = paramValidation.data;
        const { name, description, status } = bodyValidation.data;

        const designationRepository = AppDataSource.getRepository(Designation);
        const designation = await designationRepository.findOneBy({ id: designationId });

        if (!designation) {
            res.status(404).json({ message: "Designation not found" });
            return;
        }

        if (name !== undefined) designation.name = name;
        if (description !== undefined) designation.description = description;
        if (status !== undefined) designation.status = status;

        const updatedDesignation = await designationRepository.save(designation);

        const currentUser = (req as any).user;
        const isHr = currentUser?.role === "hr";
        const actorName = currentUser?.name || (isHr ? "HR" : "Admin");

        if (isHr) {
            createAndSendNotification({
                title: "Designation Updated by HR 🏷️",
                message: `HR ${actorName} updated designation: "${designation.name}".`,
                type: "designation_action",
                forRole: "admin",
                senderId: currentUser?.id,
            }).catch((err) => console.error("Admin notification error:", err));
        } else {
            createAndSendNotification({
                title: "Designation Updated by Admin 🏷️",
                message: `Admin updated designation: "${designation.name}".`,
                type: "designation_action",
                forRole: "hr",
                senderId: currentUser?.id,
            }).catch((err) => console.error("HR notification error:", err));
        }

        res.status(200).json(updatedDesignation);
    } catch (error) {
        console.error("Error updating designation:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteDesignation = async (req: Request, res: Response) => {
    try {
        const paramValidation = designationIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            res.status(400).json({
                message: getFirstErrorMessage(paramValidation.error, "Invalid designation ID"),
                errors: formatZodErrors(paramValidation.error),
            });
            return;
        }

        const { id: designationId } = paramValidation.data;
        const designationRepository = AppDataSource.getRepository(Designation);
        const designation = await designationRepository.findOneBy({ id: designationId });

        if (!designation) {
            res.status(404).json({ message: "Designation not found" });
            return;
        }

        const desigName = designation.name;
        await designationRepository.remove(designation);

        const currentUser = (req as any).user;
        const isHr = currentUser?.role === "hr";
        const actorName = currentUser?.name || (isHr ? "HR" : "Admin");

        if (isHr) {
            createAndSendNotification({
                title: "Designation Deleted by HR 🗑️",
                message: `HR ${actorName} deleted designation: "${desigName}".`,
                type: "designation_action",
                forRole: "admin",
                senderId: currentUser?.id,
            }).catch((err) => console.error("Admin notification error:", err));
        } else {
            createAndSendNotification({
                title: "Designation Deleted by Admin 🗑️",
                message: `Admin deleted designation: "${desigName}".`,
                type: "designation_action",
                forRole: "hr",
                senderId: currentUser?.id,
            }).catch((err) => console.error("HR notification error:", err));
        }

        res.status(200).json({ message: "Designation deleted successfully" });
    } catch (error) {
        console.error("Error deleting designation:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// export const getDesignationsByStatus = async (req: Request, res: Response) => {
//     try {
//         const queryValidation = designationStatusQuerySchema.safeParse(req.query);
//         if (!queryValidation.success) {
//             res.status(400).json({
//                 message: getFirstErrorMessage(queryValidation.error, "Status query parameter must be 'true', 'false', 'Active', or 'Inactive'"),
//                 errors: formatZodErrors(queryValidation.error),
//             });
//             return;
//         }

//         const { status } = queryValidation.data;
//         const designationRepository = AppDataSource.getRepository(Designation);
//         const designations = await designationRepository.findBy({ status });

//         res.status(200).json(designations);
//     } catch (error) {
//         console.error("Error fetching designations by status:", error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

export const getDesignationsById = async (req: Request, res: Response) => {
    return getDesignationById(req, res);
};
