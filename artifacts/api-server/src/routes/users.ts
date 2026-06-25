import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUser, hashPassword } from "../lib/auth";

const router: IRouter = Router();

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  let users: (typeof usersTable.$inferSelect)[];
  if (user.role === "super_admin") {
    users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  } else {
    users = await db.select().from(usersTable)
      .where(eq(usersTable.tenantId, user.tenantId!))
      .orderBy(usersTable.createdAt);
  }
  res.json(users.map(safeUser));
});

router.post("/users", requireAuth, async (req, res): Promise<void> => {
  const actor = getUser(req);
  const { email, firstName, lastName, role, password, assignedCountyId, assignedConstituencyId, assignedWardId, assignedVillageId } = req.body;
  if (!email || !firstName || !lastName || !role || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    email, firstName, lastName, role, passwordHash,
    tenantId: actor.role === "super_admin" ? req.body.tenantId : actor.tenantId,
    assignedCountyId, assignedConstituencyId, assignedWardId, assignedVillageId,
  }).returning();
  res.status(201).json(safeUser(user));
});

router.get("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.userId as string, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(safeUser(user));
});

router.patch("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.userId as string, 10);
  const updates: Record<string, unknown> = {};
  const allowed = ["firstName", "lastName", "role", "isActive", "assignedCountyId", "assignedConstituencyId", "assignedWardId", "assignedVillageId"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(safeUser(user));
});

router.delete("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.userId as string, 10);
  const [user] = await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ message: "User deactivated" });
});

export default router;
