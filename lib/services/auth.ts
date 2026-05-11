import { getDb } from '@/lib/db';
import {
  createUser,
  findUserByEmail,
  findUserById,
} from '@/lib/db/users';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  createSession,
  destroySession,
  getSession,
} from '@/lib/auth/session';
import {
  UnauthenticatedError,
  ConflictError,
} from '@/lib/errors';
import type { RegisterInput } from '@/lib/validators/auth';
import { logInfo, getRequestId } from '@/lib/logger';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function toPublicUser(user: User): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function register(data: RegisterInput): Promise<User> {
  const db = getDb();

  // Check if email already exists
  const existingUser = findUserByEmail(db, data.email);
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user
  const user = createUser(db, {
    email: data.email,
    passwordHash,
    name: data.name,
  });

  // Create session
  await createSession(user.id);

  return toPublicUser(user);
}

export async function login(email: string, password: string): Promise<User> {
  const db = getDb();

  // Find user by email
  const user = findUserByEmail(db, email);
  if (!user) {
    throw new UnauthenticatedError('Invalid email or password');
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthenticatedError('Invalid email or password');
  }

  // Create session
  await createSession(user.id);

  // Log login event
  logInfo('User logged in', {
    userId: user.id,
    email: email,
    requestId: getRequestId(),
  });

  return toPublicUser(user);
}

export async function logout(): Promise<void> {
  const session = await getSession();
  const userId = session?.userId;

  await destroySession();

  // Log logout event
  if (userId) {
    logInfo('User logged out', {
      userId,
      requestId: getRequestId(),
    });
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  const userId = session.userId;

  if (!userId) {
    return null;
  }

  const db = getDb();
  const user = findUserById(db, userId);

  return user ? toPublicUser(user) : null;
}

export async function requireAuthenticatedUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthenticatedError('Authentication required');
  }

  return user;
}
