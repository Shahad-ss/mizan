import { getAuth } from "@clerk/express";
import {
  AddSavingsContributionBody,
  AddSavingsContributionParams,
  AddSavingsContributionResponse,
  CreateBillBody,
  CreateBillResponse,
  CreateDebtBody,
  CreateDebtResponse,
  CreateSavingsGoalBody,
  CreateSavingsGoalResponse,
  DeleteBillParams,
  DeleteDebtParams,
  DeleteSavingsGoalParams,
  GetDashboardResponse,
  GetProfileResponse,
  ListBillsResponse,
  ListDebtsResponse,
  ListSavingsGoalsResponse,
  RecordDebtPaymentBody,
  RecordDebtPaymentParams,
  RecordDebtPaymentResponse,
  UpdateBillBody,
  UpdateBillParams,
  UpdateBillResponse,
  UpdateDebtBody,
  UpdateDebtParams,
  UpdateDebtResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  UpdateSavingsGoalBody,
  UpdateSavingsGoalParams,
  UpdateSavingsGoalResponse,
} from "@workspace/api-zod";
import {
  billsTable,
  db,
  debtPaymentsTable,
  debtsTable,
  savingsContributionsTable,
  savingsGoalsTable,
  userProfilesTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

function requireUserId(req: Request, res: Response): string | null {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId as string | undefined ?? auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

function dateOnly(value: Date | string): string {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function billView(bill: typeof billsTable.$inferSelect) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: bill.id,
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.dueDate,
    frequency: bill.frequency,
    paid: bill.paid,
    status: bill.paid ? "paid" : bill.dueDate < today ? "overdue" : "upcoming",
  };
}

function debtView(debt: typeof debtsTable.$inferSelect) {
  const paid = Math.max(0, debt.totalAmount - debt.remainingAmount);
  return {
    id: debt.id,
    name: debt.name,
    totalAmount: debt.totalAmount,
    remainingAmount: debt.remainingAmount,
    monthlyPayment: debt.monthlyPayment,
    dueDate: debt.dueDate,
    progress: debt.totalAmount > 0 ? Math.min(100, (paid / debt.totalAmount) * 100) : 0,
  };
}

function savingsView(goal: typeof savingsGoalsTable.$inferSelect) {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const now = new Date();
  const target = new Date(`${goal.targetDate}T12:00:00Z`);
  const months = Math.max(
    1,
    (target.getUTCFullYear() - now.getUTCFullYear()) * 12 +
      target.getUTCMonth() -
      now.getUTCMonth(),
  );
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: goal.targetDate,
    remainingAmount,
    monthlyTarget: remainingAmount / months,
    progress:
      goal.targetAmount > 0
        ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
        : 0,
  };
}

router.get("/profile", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));
  res.json(
    GetProfileResponse.parse({
      displayName: null,
      monthlyIncome: profile?.monthlyIncome ?? 0,
      preferredCurrency: profile?.preferredCurrency ?? "SAR",
      language: profile?.language ?? "en",
      theme: profile?.theme ?? "light",
    }),
  );
});

router.patch("/profile", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [profile] = await db
    .insert(userProfilesTable)
    .values({ userId, ...body.data })
    .onConflictDoUpdate({
      target: userProfilesTable.userId,
      set: body.data,
    })
    .returning();
  res.json(
    UpdateProfileResponse.parse({
      displayName: null,
      monthlyIncome: profile.monthlyIncome,
      preferredCurrency: profile.preferredCurrency,
      language: profile.language,
      theme: profile.theme,
    }),
  );
});

router.get("/bills", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const bills = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.userId, userId))
    .orderBy(billsTable.dueDate);
  res.json(ListBillsResponse.parse(bills.map(billView)));
});

router.post("/bills", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = CreateBillBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [bill] = await db
    .insert(billsTable)
    .values({
      ...body.data,
      dueDate: dateOnly(body.data.dueDate),
      userId,
      paid: body.data.paid ?? false,
    })
    .returning();
  res.status(201).json(CreateBillResponse.parse(billView(bill)));
});

router.patch("/bills/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const params = UpdateBillParams.safeParse(req.params);
  const body = UpdateBillBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid bill update" });
    return;
  }
  const { dueDate, ...billUpdates } = body.data;
  const [bill] = await db
    .update(billsTable)
    .set({
      ...billUpdates,
      ...(dueDate ? { dueDate: dateOnly(dueDate) } : {}),
    })
    .where(and(eq(billsTable.id, params.data.id), eq(billsTable.userId, userId)))
    .returning();
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  res.json(UpdateBillResponse.parse(billView(bill)));
});

router.delete("/bills/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const params = DeleteBillParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bill] = await db
    .delete(billsTable)
    .where(and(eq(billsTable.id, params.data.id), eq(billsTable.userId, userId)))
    .returning();
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/debts", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const debts = await db
    .select()
    .from(debtsTable)
    .where(eq(debtsTable.userId, userId))
    .orderBy(debtsTable.dueDate);
  res.json(ListDebtsResponse.parse(debts.map(debtView)));
});

router.post("/debts", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = CreateDebtBody.safeParse(req.body);
  if (!body.success || body.data.remainingAmount > body.data.totalAmount) {
    res.status(400).json({ error: "Invalid debt details" });
    return;
  }
  const [debt] = await db
    .insert(debtsTable)
    .values({ ...body.data, dueDate: dateOnly(body.data.dueDate), userId })
    .returning();
  res.status(201).json(CreateDebtResponse.parse(debtView(debt)));
});

router.patch("/debts/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const params = UpdateDebtParams.safeParse(req.params);
  const body = UpdateDebtBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid debt update" });
    return;
  }
  const { dueDate, ...debtUpdates } = body.data;
  const [debt] = await db
    .update(debtsTable)
    .set({
      ...debtUpdates,
      ...(dueDate ? { dueDate: dateOnly(dueDate) } : {}),
    })
    .where(and(eq(debtsTable.id, params.data.id), eq(debtsTable.userId, userId)))
    .returning();
  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }
  res.json(UpdateDebtResponse.parse(debtView(debt)));
});

router.delete("/debts/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const params = DeleteDebtParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [debt] = await db
    .delete(debtsTable)
    .where(and(eq(debtsTable.id, params.data.id), eq(debtsTable.userId, userId)))
    .returning();
  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/debts/:id/payments", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const params = RecordDebtPaymentParams.safeParse(req.params);
  const body = RecordDebtPaymentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid payment" });
    return;
  }
  const [existing] = await db
    .select()
    .from(debtsTable)
    .where(and(eq(debtsTable.id, params.data.id), eq(debtsTable.userId, userId)));
  if (!existing) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }
  const payment = Math.min(body.data.amount, existing.remainingAmount);
  const [debt] = await db
    .update(debtsTable)
    .set({ remainingAmount: Math.max(0, existing.remainingAmount - payment) })
    .where(and(eq(debtsTable.id, existing.id), eq(debtsTable.userId, userId)))
    .returning();
  await db.insert(debtPaymentsTable).values({ debtId: debt.id, userId, amount: payment });
  res.json(RecordDebtPaymentResponse.parse(debtView(debt)));
});

router.get("/savings-goals", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const goals = await db
    .select()
    .from(savingsGoalsTable)
    .where(eq(savingsGoalsTable.userId, userId))
    .orderBy(savingsGoalsTable.targetDate);
  res.json(ListSavingsGoalsResponse.parse(goals.map(savingsView)));
});

router.post("/savings-goals", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = CreateSavingsGoalBody.safeParse(req.body);
  if (!body.success || body.data.currentAmount > body.data.targetAmount) {
    res.status(400).json({ error: "Invalid savings goal" });
    return;
  }
  const [goal] = await db
    .insert(savingsGoalsTable)
    .values({ ...body.data, targetDate: dateOnly(body.data.targetDate), userId })
    .returning();
  res.status(201).json(CreateSavingsGoalResponse.parse(savingsView(goal)));
});

router.patch("/savings-goals/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const params = UpdateSavingsGoalParams.safeParse(req.params);
  const body = UpdateSavingsGoalBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid savings goal update" });
    return;
  }
  const { targetDate, ...goalUpdates } = body.data;
  const [goal] = await db
    .update(savingsGoalsTable)
    .set({
      ...goalUpdates,
      ...(targetDate ? { targetDate: dateOnly(targetDate) } : {}),
    })
    .where(
      and(
        eq(savingsGoalsTable.id, params.data.id),
        eq(savingsGoalsTable.userId, userId),
      ),
    )
    .returning();
  if (!goal) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  res.json(UpdateSavingsGoalResponse.parse(savingsView(goal)));
});

router.delete("/savings-goals/:id", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const params = DeleteSavingsGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [goal] = await db
    .delete(savingsGoalsTable)
    .where(
      and(
        eq(savingsGoalsTable.id, params.data.id),
        eq(savingsGoalsTable.userId, userId),
      ),
    )
    .returning();
  if (!goal) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/savings-goals/:id/contributions", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const params = AddSavingsContributionParams.safeParse(req.params);
  const body = AddSavingsContributionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid contribution" });
    return;
  }
  const [existing] = await db
    .select()
    .from(savingsGoalsTable)
    .where(
      and(
        eq(savingsGoalsTable.id, params.data.id),
        eq(savingsGoalsTable.userId, userId),
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  const amount = Math.min(body.data.amount, Math.max(0, existing.targetAmount - existing.currentAmount));
  const [goal] = await db
    .update(savingsGoalsTable)
    .set({ currentAmount: existing.currentAmount + amount })
    .where(
      and(eq(savingsGoalsTable.id, existing.id), eq(savingsGoalsTable.userId, userId)),
    )
    .returning();
  await db
    .insert(savingsContributionsTable)
    .values({ goalId: goal.id, userId, amount });
  res.json(AddSavingsContributionResponse.parse(savingsView(goal)));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const [profiles, bills, debts, goals] = await Promise.all([
    db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId)),
    db
      .select()
      .from(billsTable)
      .where(eq(billsTable.userId, userId))
      .orderBy(desc(billsTable.createdAt)),
    db
      .select()
      .from(debtsTable)
      .where(eq(debtsTable.userId, userId))
      .orderBy(desc(debtsTable.createdAt)),
    db
      .select()
      .from(savingsGoalsTable)
      .where(eq(savingsGoalsTable.userId, userId))
      .orderBy(desc(savingsGoalsTable.createdAt)),
  ]);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 7);
  const soonKey = soon.toISOString().slice(0, 10);
  const unpaid = bills.filter((bill) => !bill.paid);
  const currentSavings = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const savingsTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const activity = [
    ...bills.slice(0, 2).map((bill) => ({
      id: `bill-${bill.id}`,
      title: bill.paid ? "Bill paid" : "Bill added",
      detail: bill.name,
      kind: "bill",
      occurredAt: bill.updatedAt.toISOString(),
    })),
    ...debts.slice(0, 2).map((debt) => ({
      id: `debt-${debt.id}`,
      title: "Debt updated",
      detail: debt.name,
      kind: "debt",
      occurredAt: debt.updatedAt.toISOString(),
    })),
    ...goals.slice(0, 2).map((goal) => ({
      id: `goal-${goal.id}`,
      title: "Savings goal updated",
      detail: goal.name,
      kind: "savings",
      occurredAt: goal.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);
  const nextBill = [...unpaid].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  res.json(
    GetDashboardResponse.parse({
      monthlyIncome: profiles[0]?.monthlyIncome ?? 0,
      upcomingBills: unpaid.reduce((sum, bill) => sum + bill.amount, 0),
      totalRemainingDebt: debts.reduce((sum, debt) => sum + debt.remainingAmount, 0),
      currentSavings,
      savingsProgress: savingsTarget > 0 ? (currentSavings / savingsTarget) * 100 : 0,
      billsDueSoon: unpaid.filter(
        (bill) => bill.dueDate >= todayKey && bill.dueDate <= soonKey,
      ).length,
      nextBill: nextBill?.name ?? null,
      recentActivity: activity,
    }),
  );
});

export default router;