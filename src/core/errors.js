export class RuntimeError extends Error {
    constructor(message) {
        super(message)
        this.name = this.constructor.name
        Error.captureStackTrace && Error.captureStackTrace(this, this.constructor)
    }
}

export class UnmplementedError extends RuntimeError {
    constructor(message) {
        super(message)
    }
}
