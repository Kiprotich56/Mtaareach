import { pgTable, serial, text, integer, boolean, timestamp, json, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const smsTemplatesTable = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  body: text("body").notNull(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  senderId: text("sender_id").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  templateId: integer("template_id").references(() => smsTemplatesTable.id),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  estimatedCost: numeric("estimated_cost", { precision: 14, scale: 4 }).notNull().default("0.00"),
  actualCost: numeric("actual_cost", { precision: 14, scale: 4 }).notNull().default("0.00"),
  audienceFilter: json("audience_filter").$type<Record<string, unknown>>().notNull().default({}),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsLogsTable = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id),
  contactId: integer("contact_id").notNull(),
  phone: text("phone").notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSmsTemplateSchema = createInsertSchema(smsTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSmsLogSchema = createInsertSchema(smsLogsTable).omit({ id: true, createdAt: true });

export type SmsTemplate = typeof smsTemplatesTable.$inferSelect;
export type Campaign = typeof campaignsTable.$inferSelect;
export type SmsLog = typeof smsLogsTable.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
