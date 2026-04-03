import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';

export interface SessionData {
  userId: string | null;
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'development-secret-key-change-in-production',
  cookieName: 'session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function createSession(userId: string): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
