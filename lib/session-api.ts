import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

export interface SessionData {
  userId: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const secretKey = process.env.SESSION_SECRET || 'luxury-commerce-hub-secret-key-change-in-production';
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(userId: string, user: { id: string; email: string; role: string }): Promise<string> {
  const session = await new SignJWT({ userId, user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);

  return session;
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionData;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

export async function setSessionCookie(sessionToken: string) {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const isCrossOrigin = !!process.env.FRONTEND_URL &&
    process.env.FRONTEND_URL !== 'http://localhost:3000';

  cookieStore.set('session', sessionToken, {
    httpOnly: true,
    secure: isProduction || isCrossOrigin,
    sameSite: isCrossOrigin ? 'none' : 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

