import {
  boolean,
  date,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const userProfilesTable = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  monthlyIncome: doublePrecision("monthly_income").notNull().default(0),
  preferredCurrency: text("preferred_currency").notNull().default("SAR"),
  language: text("language").notNull().default("en"),
  theme: text("theme").notNull().default("light"),
  ...auditColumns,
});

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  frequency: text("frequency").notNull(),
  paid: boolean("paid").notNull().default(false),
  ...auditColumns,
});

export const debtsTable = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  remainingAmount: doublePrecision("remaining_amount").notNull(),
  monthlyPayment: doublePrecision("monthly_payment").notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  ...auditColumns,
});

export const debtPaymentsTable = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  debtId: integer("debt_id").notNull(),
  userId: text("user_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savingsGoalsTable = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  targetAmount: doublePrecision("target_amount").notNull(),
  currentAmount: doublePrecision("current_amount").notNull(),
  targetDate: date("target_date", { mode: "string" }).notNull(),
  ...auditColumns,
});

export const savingsContributionsTable = pgTable("savings_contributions", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull(),
  userId: text("user_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(userProfilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertBillSchema = createInsertSchema(billsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertDebtSchema = createInsertSchema(debtsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSavingsGoalSchema = createInsertSchema(savingsGoalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertDebt = z.infer<typeof insertDebtSchema>;
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;