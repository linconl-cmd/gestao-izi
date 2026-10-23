export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string = "DOMAIN_ERROR",
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "VALIDATION");
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string) {
    super(`${entity} not found`, "NOT_FOUND");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Operation not allowed") {
    super(message, "FORBIDDEN");
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}

export class InsufficientStockError extends DomainError {
  constructor(message = "Insufficient stock") {
    super(message, "INSUFFICIENT_STOCK");
  }
}

export class InfrastructureError extends DomainError {
  constructor(message: string) {
    super(message, "INFRASTRUCTURE");
  }
}
