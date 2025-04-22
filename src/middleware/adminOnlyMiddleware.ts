import { Request, Response, NextFunction } from "express";

export const adminOnlyMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if ((req as any).user?.role !== "manager") {
        res.status(403).json({
            message: 'Access denied: Admins only'
        });
        return;
    }

    next();
}