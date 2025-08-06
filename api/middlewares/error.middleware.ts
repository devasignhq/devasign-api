import { ErrorClass } from '../models/general.model';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export const errorHandler = ((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", error);

    if (error instanceof ErrorClass) {
        return res.status(420).json({
            error: { ...error },
        });
    }

    if (error.name === "ValidationError") {
        return res.status(404).json({
            error: {
                name: "ValidationError",
                message: error.message,
                details: error.errors,
            },
        });
    }

    res.status(error.status || 500).json({
        error: {
            message: "Internal Server Error",
            details: error || null,
        },
    });
}) as ErrorRequestHandler;