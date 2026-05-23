import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const SESSION_COOKIE_NAME = "mtl_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(
  username: string,
  password: string
): Promise<void> {
  const passwordHash = await hashPassword(password);
  await prisma.adminUser.create({
    data: { username, passwordHash },
  });
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<string | null> {
  const user = await prisma.adminUser.findUnique({
    where: { username },
  });

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt,
    },
  });

  return sessionId;
}

export async function getSessionUser(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return null;
  }

  return session.user;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) return null;

  return getSessionUser(sessionId);
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
}

export function setSessionCookie(sessionId: string): void {
  // This will be called from server actions/routes
}

export const SESSION_COOKIE = SESSION_COOKIE_NAME;
