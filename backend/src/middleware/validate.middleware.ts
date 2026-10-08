import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const formatZodErrors = (error: ZodError) => {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
};

export const getFirstErrorMessage = (error: ZodError, fallback = "Validation failed"): string => {
  return error.issues[0]?.message || fallback;
};

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: getFirstErrorMessage(result.error),
        errors: formatZodErrors(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        message: getFirstErrorMessage(result.error, "Invalid query parameters"),
        errors: formatZodErrors(result.error),
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        message: getFirstErrorMessage(result.error, "Invalid route parameters"),
        errors: formatZodErrors(result.error),
      });
      return;
    }
    req.params = result.data as any;
    next();
  };
};
