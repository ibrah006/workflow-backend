// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export const validateBody = (DtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const instance = plainToInstance(DtoClass, req.body);
    const errors: ValidationError[] = await validate(instance, {
      whitelist:            true,
      forbidNonWhitelisted: false,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints || {})
      );
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  messages,
      });
      return;
    }

    req.body = instance;
    next();
  };
};

export const validateQuery = (DtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const instance = plainToInstance(DtoClass, req.query);
    const errors: ValidationError[] = await validate(instance!, {
      whitelist:             true,
      skipMissingProperties: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints || {})
      );
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors:  messages,
      });
      return;
    }

    req.query = instance as any;
    next();
  };
};