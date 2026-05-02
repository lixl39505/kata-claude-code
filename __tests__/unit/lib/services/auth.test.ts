/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { register, login, logout, getCurrentUser, requireAuthenticatedUser } from '@/lib/services/auth';
import { ConflictError, UnauthenticatedError } from '@/lib/errors';

// Mock all dependencies
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('@/lib/auth/session', () => ({
  createSession: jest.fn(),
  destroySession: jest.fn(),
  getSession: jest.fn(),
}));

import { getDb } from '@/lib/db';
import * as passwordModule from '@/lib/auth/password';
import * as sessionModule from '@/lib/auth/session';

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockHashPassword = passwordModule.hashPassword as jest.MockedFunction<typeof passwordModule.hashPassword>;
const mockVerifyPassword = passwordModule.verifyPassword as jest.MockedFunction<typeof passwordModule.verifyPassword>;
const mockCreateSession = sessionModule.createSession as jest.MockedFunction<typeof sessionModule.createSession>;
const mockDestroySession = sessionModule.destroySession as jest.MockedFunction<typeof sessionModule.destroySession>;
const mockGetSession = sessionModule.getSession as jest.MockedFunction<typeof sessionModule.getSession>;

describe('Auth Service', () => {
  let mockDb: {
    prepare: jest.Mock;
  };

  beforeEach(() => {
    // Create mock database with user methods
    mockDb = {
      prepare: jest.fn(),
    };
    mockGetDb.mockReturnValue(mockDb as any);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'new@example.com',
        passwordHash: 'hashed-password',
        name: 'New User',
      };

      // Mock createUser to return a user
      mockDb.prepare.mockReturnValue({
        run: jest.fn(() => ({})),
        get: jest.fn(() => null), // findUserByEmail returns null (user doesn't exist)
      } as never);

      mockHashPassword.mockResolvedValue('hashed-password');
      mockCreateSession.mockResolvedValue(undefined);

      const user = await register({
        email: userData.email,
        password: 'PlainPassword123!',
        name: userData.name,
      });

      expect(mockHashPassword).toHaveBeenCalledWith('PlainPassword123!');
      expect(mockCreateSession).toHaveBeenCalled();
    });

    it('should throw ConflictError if email already exists', async () => {
      const existingUser = {
        id: 'existing-123',
        email: 'existing@example.com',
        passwordHash: 'hash',
        name: 'Existing User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: jest.fn(() => existingUser), // findUserByEmail returns existing user
        run: jest.fn(() => ({})),
      } as never);

      await expect(
        register({
          email: 'existing@example.com',
          password: 'Password123!',
          name: 'Another User',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'login@example.com',
        passwordHash: 'stored-hash',
        name: 'Login User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: jest.fn(() => existingUser),
        run: jest.fn(() => ({})),
      } as never);

      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(undefined);

      const loggedInUser = await login('login@example.com', 'password');

      expect(loggedInUser).toBeDefined();
      expect(loggedInUser.id).toBe(existingUser.id);
      expect(mockVerifyPassword).toHaveBeenCalledWith('password', 'stored-hash');
      expect(mockCreateSession).toHaveBeenCalledWith(existingUser.id);
    });

    it('should throw UnauthenticatedError for non-existent email', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn(() => null), // User not found
        run: jest.fn(() => ({})),
      } as never);

      await expect(
        login('nonexistent@example.com', 'password')
      ).rejects.toThrow(UnauthenticatedError);
    });

    it('should throw UnauthenticatedError for wrong password', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'login@example.com',
        passwordHash: 'stored-hash',
        name: 'Login User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: jest.fn(() => existingUser),
        run: jest.fn(() => ({})),
      } as never);

      mockVerifyPassword.mockResolvedValue(false);

      await expect(
        login('login@example.com', 'wrong-password')
      ).rejects.toThrow(UnauthenticatedError);
    });
  });

  describe('logout', () => {
    it('should destroy session', async () => {
      mockDestroySession.mockResolvedValue(undefined);

      await logout();

      expect(mockDestroySession).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user if session exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'me@example.com',
        name: 'Me User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: jest.fn(() => mockUser),
        run: jest.fn(() => ({})),
      } as never);

      mockGetSession.mockResolvedValue({
        userId: 'user-123',
        save: jest.fn(),
        destroy: jest.fn(),
      } as never);

      const currentUser = await getCurrentUser();

      expect(currentUser).not.toBeNull();
      expect(currentUser?.id).toBe(mockUser.id);
    });

    it('should return null if session does not exist', async () => {
      mockGetSession.mockResolvedValue({
        userId: null,
        save: jest.fn(),
        destroy: jest.fn(),
      } as never);

      const currentUser = await getCurrentUser();

      expect(currentUser).toBeNull();
    });
  });

  describe('requireAuthenticatedUser', () => {
    it('should return user if authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'auth@example.com',
        name: 'Auth User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: jest.fn(() => mockUser),
        run: jest.fn(() => ({})),
      } as never);

      mockGetSession.mockResolvedValue({
        userId: 'user-123',
        save: jest.fn(),
        destroy: jest.fn(),
      } as never);

      const currentUser = await requireAuthenticatedUser();

      expect(currentUser).not.toBeNull();
      expect(currentUser?.id).toBe(mockUser.id);
    });

    it('should throw UnauthenticatedError if not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        userId: null,
        save: jest.fn(),
        destroy: jest.fn(),
      } as never);

      await expect(requireAuthenticatedUser()).rejects.toThrow(UnauthenticatedError);
    });
  });
});
