import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const jwtSecret = process.env.JWT_SECRET || "your_super_secret_jwt_key_123";
        const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
        (req as any).user = decoded;
        next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ message: "Invalid or Expired Token" });
    }
}