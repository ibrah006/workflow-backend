
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ error: 'Token missing' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        (req as any).user = payload;
        next();
    } catch(err) {
        res.status(403).json({ error: 'Invalid token' });
        return;
    }
}

// TODO: create a middleware function that manages admin only endpoints