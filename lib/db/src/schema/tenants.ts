import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  defaultSenderId: text("default_sender_id"),
  timezone: text("timezone").notNull().default("Africa/Nairobi"),
  smsRatePerMessage: numeric("sms_rate_per_message", { precision: 10, scale: 4 }).notNull().default("1.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tenantSettingsTable = pgTable("tenant_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id).unique(),
  defaultSenderId: text("default_sender_id"),
  timezone: text("timezone").notNull().default("Africa/Nairobi"),
  smsRatePerMessage: numeric("sms_rate_per_message", { precision: 10, scale: 4 }).notNull().default("1.00"),
  allowFieldAgentVillageSubmission: boolean("allow_field_agent_village_submission").notNull().default(true),
  requireConsentForSms: boolean("require_consent_for_sms").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id).unique(),
  balance: numeric("balance", { precision: 14, scale: 4 }).notNull().default("0.00"),
  currency: text("currency").notNull().default("KES"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
  balanceBefore: numeric("balance_before", { precision: 14, scale: 4 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 14, scale: 4 }).notNull(),
  description: text("description").notNull(),
  campaignId: integer("campaign_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true });
export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, updatedAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactionsTable).omit({ id: true, createdAt: true });

export type Tenant = typeof tenantsTable.$inferSelect;
export type TenantSettings = typeof tenantSettingsTable.$inferSelect;
export type Wallet = typeof walletsTable.$inferSelect;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
