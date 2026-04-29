export class ServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ServiceError"
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class NotFoundError extends ServiceError {
  constructor(message = "Not found") {
    super(message)
    this.name = "NotFoundError"
  }
}

export class PlanLimitError extends ServiceError {
  constructor(message: string) {
    super(message)
    this.name = "PlanLimitError"
  }
}
