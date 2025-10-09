import { STATUS_CODES } from "../helper";

export class ErrorClass {
    public readonly name: string;
    public readonly message: string;
    public readonly details: unknown;
    public readonly status: number;

    constructor(
        name: string, 
        details: unknown, 
        message: string, 
        status: number
    ) {
        this.name = name;
        this.message = message;
        this.details = details;
        this.status = status;
    }

}

export class NotFoundErrorClass extends ErrorClass {
    constructor(message: string) {
        super(
            "NotFoundError", 
            null,
            message,
            STATUS_CODES.NOT_FOUND
        );
    }
}

export class UnauthorizedErrorClass extends ErrorClass {
    constructor(message: string) {
        super(
            "UnauthorizedError", 
            null, 
            message, 
            STATUS_CODES.UNAUTHORIZED
        );
    }
}
