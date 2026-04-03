import { AppError, ErrorCodes } from './index';

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super(ErrorCodes.UNAUTHENTICATED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(ErrorCodes.FORBIDDEN, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCodes.VALIDATION_ERROR, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(ErrorCodes.NOT_FOUND, `${resource} not found`);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(ErrorCodes.INVALID_STATE_TRANSITION, `Cannot transition from ${from} to ${to}`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCodes.CONFLICT, message, details);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(ErrorCodes.INTERNAL, message);
  }
}

// Re-export AppError for convenience
export { AppError };
