export const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

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

export function createApiError(code: ErrorCode, message: string, details?: unknown): ApiError {
  return { code, message, details };
}

// Re-export API handler functions
export { handleApiError, withErrorHandler } from './api-handler';