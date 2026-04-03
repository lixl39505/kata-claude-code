import { registerSchema, loginSchema } from '@/lib/validators/auth';
import { ZodError } from 'zod';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    const validData = {
      email: 'user@example.com',
      password: 'SecurePass123!',
      name: 'John Doe',
    };

    it('should validate correct registration data', () => {
      const result = registerSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should reject invalid email', () => {
      const invalidData = { ...validData, email: 'not-an-email' };

      expect(() => registerSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject short password', () => {
      const invalidData = { ...validData, password: 'short' };

      expect(() => registerSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject empty name', () => {
      const invalidData = { ...validData, name: '' };

      expect(() => registerSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject long name', () => {
      const invalidData = { ...validData, name: 'a'.repeat(101) };

      expect(() => registerSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject missing email', () => {
      const { email, ...data } = validData;

      expect(() => registerSchema.parse(data)).toThrow(ZodError);
    });

    it('should reject missing password', () => {
      const { password, ...data } = validData;

      expect(() => registerSchema.parse(data)).toThrow(ZodError);
    });

    it('should reject missing name', () => {
      const { name, ...data } = validData;

      expect(() => registerSchema.parse(data)).toThrow(ZodError);
    });
  });

  describe('loginSchema', () => {
    const validData = {
      email: 'user@example.com',
      password: 'SecurePass123!',
    };

    it('should validate correct login data', () => {
      const result = loginSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should reject invalid email', () => {
      const invalidData = { ...validData, email: 'not-an-email' };

      expect(() => loginSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject empty password', () => {
      const invalidData = { ...validData, password: '' };

      expect(() => loginSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject missing email', () => {
      const { email, ...data } = validData;

      expect(() => loginSchema.parse(data)).toThrow(ZodError);
    });

    it('should reject missing password', () => {
      const { password, ...data } = validData;

      expect(() => loginSchema.parse(data)).toThrow(ZodError);
    });
  });
});
