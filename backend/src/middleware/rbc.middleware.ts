import { Request, Response, NextFunction } from "express";

export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized: No user session found" });
        }

        const role = user.role;

        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ 
                message: `Forbidden: Role '${role}' is not allowed to access this resource` 
            });
        }

        next();
    };
};