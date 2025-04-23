import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";

export const adminOnlyMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (User.isAdmin((req as any).user?.role)) {
        res.status(403).json({
            message: 'Access denied: Admins only'
        });
        return;
    }

    next();
}