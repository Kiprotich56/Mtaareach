import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const smsGatewaysTable = pgTable("sms_gateways", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  isActive: boolean("is_active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(false),
  totalSent: integer("total_sent").notNull().default(0),
  deliveryRate: numeric("delivery_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const senderIdsTable = pgTable("sender_ids", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  rejectionReason: text("rejection_reason"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  actorId: integer("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role").notNull(),
  resourceType: text("resource_type"),
  resourceId: integer("resource_id"),
  tenantId: integer("tenant_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSmsGatewaySchema = createInsertSchema(smsGatewaysTable).omit({ id: true, createdAt: true });
export const insertSenderIdSchema = createInsertSchema(senderIdsTable).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, createdAt: true });

export type SmsGateway = typeof smsGatewaysTable.$inferSelect;
export type SenderId = typeof senderIdsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertSmsGateway = z.infer<typeof insertSmsGatewaySchema>;
export type InsertSenderId = z.infer<typeof insertSenderIdSchema>;
