import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session-api';
import { storage } from '@/lib/storage';

export async function getAuthenticatedUser(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return await storage.getUser(session.userId);
}

export async function requireAuth(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  const user = await storage.getUser(session.userId);
  if (!user) {
    throw new Error('User not found');
  }
  return { session, user };
}

export async function requireAdmin(req: NextRequest) {
  const { user } = await requireAuth(req);
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return { user };
}

