import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [session] = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));

  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  (req as Request & { user: typeof usersTable.$inferSelect }).user = session.user;
  next();
}

export function getUser(req: Request): typeof usersTable.$inferSelect {
  return (req as Request & { user: typeof usersTable.$inferSelect }).user;
}
