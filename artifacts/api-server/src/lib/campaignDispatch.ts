import { db, campaignsTable, contactsTable, smsLogsTable, walletsTable, walletTransactionsTable, groupMembersTable, auditLogsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { sendSmsBatch } from "./africastalking";

interface Actor {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Dispatch an existing campaign: fetch contacts, send via Africa's Talking,
 * write sms_logs, update campaign stats, deduct wallet balance.
 *
 * Runs fully async — callers should NOT await unless they want to block.
 * The campaign must already be in "sending" status before this is called.
 */
export async function dispatchCampaign(campaignId: number, actor: Actor): Promise<void> {
  try {
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, campaignId));
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const filter = campaign.audienceFilter as Record<string, unknown>;
    const tenantCondition = eq(contactsTable.tenantId, campaign.tenantId);
    const consentCondition = eq(contactsTable.consentSms, true);
    const activeCondition = eq(contactsTable.isActive, true);

    let contacts: Array<{ id: number; phone: string }> = [];

    // Support groupIds (array) or legacy groupId (single)
    const groupIds: number[] = Array.isArray(filter?.groupIds)
      ? (filter.groupIds as number[])
      : filter?.groupId
        ? [Number(filter.groupId)]
        : [];

    if (groupIds.length > 0) {
      const members = await db
        .select({ contactId: groupMembersTable.contactId })
        .from(groupMembersTable)
        .where(inArray(groupMembersTable.groupId, groupIds));
      const contactIds = members.map(m => m.contactId);
      if (contactIds.length > 0) {
        contacts = await db
          .select({ id: contactsTable.id, phone: contactsTable.phone })
          .from(contactsTable)
          .where(and(tenantCondition, consentCondition, activeCondition, inArray(contactsTable.id, contactIds)));
      }
    } else {
      contacts = await db
        .select({ id: contactsTable.id, phone: contactsTable.phone })
        .from(contactsTable)
        .where(and(tenantCondition, consentCondition, activeCondition));
    }

    if (contacts.length === 0) {
      await db.update(campaignsTable)
        .set({ status: "completed", completedAt: new Date(), totalRecipients: 0, updatedAt: new Date() })
        .where(eq(campaignsTable.id, campaignId));
      return;
    }

    await db.update(campaignsTable)
      .set({ totalRecipients: contacts.length, updatedAt: new Date() })
      .where(eq(campaignsTable.id, campaignId));

    const BATCH_SIZE = 100;
    let totalSent = 0;
    let totalFailed = 0;
    let totalCostKes = 0;

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const phones = batch.map(c => c.phone);

      try {
        const result = await sendSmsBatch({
          to: phones,
          message: campaign.body,
          from: campaign.senderId || undefined,
        });

        totalCostKes += result.totalCostKes;
        const sentSet = new Set(result.sent.map(r => r.number));
        const failedMap = new Map(result.failed.map(r => [r.number, r.status]));

        const logRows = batch.map(c => {
          const isSent = sentSet.has(c.phone);
          // If AT returned no recipients at all, default to a descriptive failure
          const noRecipientsFromAt = result.sent.length === 0 && result.failed.length === 0;
          return {
            campaignId,
            contactId: c.id,
            phone: c.phone,
            status: isSent ? "sent" : "failed",
            errorMessage: isSent
              ? null
              : noRecipientsFromAt
                ? "No response from gateway (sandbox may not accept these numbers)"
                : (failedMap.get(c.phone) ?? "Gateway rejected"),
            sentAt: isSent ? new Date() : null,
          };
        });

        await db.insert(smsLogsTable).values(logRows);
        // Count from the actual rows written, not from AT's returned recipients
        // (AT sandbox returns empty Recipients[] for numbers outside your test account)
        totalSent += logRows.filter(r => r.status === "sent").length;
        totalFailed += logRows.filter(r => r.status === "failed").length;

      } catch (batchErr) {
        const logRows = batch.map(c => ({
          campaignId,
          contactId: c.id,
          phone: c.phone,
          status: "failed" as const,
          errorMessage: batchErr instanceof Error ? batchErr.message : "Batch dispatch error",
          sentAt: null,
        }));
        await db.insert(smsLogsTable).values(logRows);
        totalFailed += batch.length;
      }
    }

    await db.update(campaignsTable).set({
      status: "completed",
      sentCount: totalSent,
      failedCount: totalFailed,
      actualCost: String(totalCostKes.toFixed(4)),
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(campaignsTable.id, campaignId));

    if (totalCostKes > 0) {
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.tenantId, campaign.tenantId));
      if (wallet) {
        const balanceBefore = parseFloat(wallet.balance);
        const newBalance = Math.max(0, balanceBefore - totalCostKes);
        await db.update(walletsTable)
          .set({ balance: String(newBalance.toFixed(4)), updatedAt: new Date() })
          .where(eq(walletsTable.id, wallet.id));
        await db.insert(walletTransactionsTable).values({
          tenantId: campaign.tenantId,
          type: "debit",
          amount: String(totalCostKes.toFixed(4)),
          balanceBefore: String(balanceBefore.toFixed(4)),
          balanceAfter: String(newBalance.toFixed(4)),
          description: `SMS campaign: ${campaign.name} (${totalSent} sent)`,
          campaignId,
        });
      }
    }

    await db.insert(auditLogsTable).values({
      tenantId: campaign.tenantId,
      actorId: actor.id,
      actorName: `${actor.firstName} ${actor.lastName}`,
      actorRole: actor.role,
      action: "campaign_executed",
      resourceType: "campaign",
      resourceId: String(campaignId),
      metadata: { name: campaign.name, sent: totalSent, failed: totalFailed, costKes: totalCostKes },
    });

  } catch (err) {
    await db.update(campaignsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(campaignsTable.id, campaignId));
  }
}
