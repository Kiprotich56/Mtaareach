import { Router, type IRouter } from "express";
import { db, walletsTable, walletTransactionsTable, tenantsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router: IRouter = Router();

function parseWallet(w: typeof walletsTable.$inferSelect, tenantName?: string) {
  return {
    id: w.id,
    tenantId: w.tenantId,
    tenantName: tenantName ?? "",
    balance: parseFloat(w.balance),
    currency: w.currency,
    updatedAt: w.updatedAt,
  };
}

router.get("/wallet", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  if (!user.tenantId) { res.status(400).json({ error: "No tenant" }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.tenantId, user.tenantId));
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, user.tenantId));
  res.json(parseWallet(wallet, tenant?.name));
});

router.get("/wallet/all", requireAuth, async (_req, res): Promise<void> => {
  const wallets = await db.select().from(walletsTable);
  const tenants = await db.select().from(tenantsTable);
  const tMap = new Map(tenants.map(t => [t.id, t.name]));
  res.json(wallets.map(w => parseWallet(w, tMap.get(w.tenantId))));
});

router.get("/wallet/transactions", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const page = parseInt(req.query.page as string ?? "1", 10);
  const limit = Math.min(parseInt(req.query.limit as string ?? "20", 10), 100);
  const offset = (page - 1) * limit;

  const where = user.tenantId ? eq(walletTransactionsTable.tenantId, user.tenantId) : sql`1=1`;
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(walletTransactionsTable).where(where);
  const txns = await db.select().from(walletTransactionsTable).where(where).orderBy(walletTransactionsTable.createdAt).limit(limit).offset(offset);
  res.json({
    data: txns.map(t => ({
      ...t,
      amount: parseFloat(t.amount),
      balanceBefore: parseFloat(t.balanceBefore),
      balanceAfter: parseFloat(t.balanceAfter),
    })),
    total, page, limit
  });
});

router.post("/wallet/top-up", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const targetTenantId = req.body.tenantId ?? user.tenantId;
  const { amount, description } = req.body;
  if (!amount || !description) { res.status(400).json({ error: "amount and description required" }); return; }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.tenantId, targetTenantId));
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  const before = parseFloat(wallet.balance);
  const after = before + parseFloat(amount);
  await db.update(walletsTable).set({ balance: String(after), updatedAt: new Date() }).where(eq(walletsTable.id, wallet.id));
  await db.insert(walletTransactionsTable).values({
    tenantId: targetTenantId,
    type: "credit",
    amount: String(amount),
    balanceBefore: String(before),
    balanceAfter: String(after),
    description,
  });

  const [updated] = await db.select().from(walletsTable).where(eq(walletsTable.id, wallet.id));
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, targetTenantId));
  res.json(parseWallet(updated, tenant?.name));
});

export default router;
