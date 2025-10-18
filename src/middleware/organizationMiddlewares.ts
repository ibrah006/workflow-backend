import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure user has organization context
 * Extracts organizationId from authenticated user and makes it easily accessible
 */
export const requireOrganization = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const organizationId = user.organizationId;
    
    if (!organizationId) {
        return res.status(403).json({ 
            message: 'You must belong to an organization to perform this action. Please create or join an organization first.' 
        });
    }

    // Make organizationId easily accessible for controllers
    (req as any).organizationId = organizationId;
    
    next();
};

/**
 * Middleware to ensure user does NOT have organization context
 * Useful for endpoints like creating/joining organizations where user shouldn't already belong to one
 */
export const requireNoOrganization = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const organizationId = user.organizationId;
    
    if (organizationId) {
        return res.status(400).json({ 
            message: 'You already belong to an organization' 
        });
    }
    
    next();
};

/**
 * Optional middleware - allows requests with or without organization context
 * Sets organizationId if available, but doesn't block if not
 */
export const optionalOrganization = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (user && user.organizationId) {
        (req as any).organizationId = user.organizationId;
    }
    
    next();
};