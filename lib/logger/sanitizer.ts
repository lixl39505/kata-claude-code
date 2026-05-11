/**
 * Log data sanitizer
 * Removes sensitive information from log output
 */

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'sessionToken',
  'token',
  'cookie',
  'authorization',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
];

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
];

/**
 * Check if a field name is sensitive
 */
export function isSensitiveField(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();

  // Check exact matches
  if (SENSITIVE_FIELDS.some(field => field.toLowerCase() === lowerFieldName)) {
    return true;
  }

  // Check pattern matches
  if (SENSITIVE_PATTERNS.some(pattern => pattern.test(lowerFieldName))) {
    return true;
  }

  return false;
}

/**
 * Sanitize a value based on its field name
 */
function sanitizeValue(fieldName: string, value: unknown): unknown {
  // If field is sensitive, mask it
  if (isSensitiveField(fieldName)) {
    return '[REDACTED]';
  }

  // If value is an object, recursively sanitize it
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return sanitizeObject(value as Record<string, unknown>);
  }

  // If value is an array, recursively sanitize its elements
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeValue(`${fieldName}[${index}]`, item)
    );
  }

  return value;
}

/**
 * Sanitize an object by removing sensitive fields
 */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(key, value);
  }

  return sanitized;
}

/**
 * Sanitize log context
 */
export function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) {
    return undefined;
  }

  return sanitizeObject(context);
}

/**
 * Mask a sensitive value (for direct use)
 */
export function maskSensitive(): string {
  return '[REDACTED]';
}
