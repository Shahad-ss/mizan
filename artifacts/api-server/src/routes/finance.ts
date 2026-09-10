import { GoogleGenAI } from "@google/genai";
import {
  AddSavingsContributionBody,
  AddSavingsContributionParams,
  AddSavingsContributionResponse,
  AskFinancialAssistantBody,
  AskFinancialAssistantResponse,
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
import type { ClientSession } from "mongodb";
import { Router, type IRouter, type Request, type Response } from "express";
import { getMongoDb, withMongoTransaction } from "../lib/mongo";
import { getSessionUserId } from "../lib/auth";

interface ProfileRecord {
  userId: string;
  monthlyIncome: number;
  preferredCurrency: string;
  language: string;
  theme: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BillRecord {
  id: number;
  userId: string;
  name: string;
  amount: number;
  dueDate: string;
  frequency: string;
  paid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DebtRecord {
  id: number;
  userId: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  dueDate: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SavingsGoalRecord {
  id: number;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CounterRecord {
  _id: string;
  seq: number;
}

const router: IRouter = Router();

async function requireUserId(req: Request, res: Response): Promise<string | null> {
  const userId = await getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

function dateOnly(value: Date | string): string {
  return typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

async function nextId(name: string, session?: ClientSession): Promise<number> {
  const db = await getMongoDb();
  const counter = await db.collection<CounterRecord>("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  if (!counter) throw new Error(`Unable to allocate ${name} id`);
  return counter.seq;
}

function billView(bill: BillRecord) {
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

function debtView(debt: DebtRecord) {
  const paid = Math.max(0, debt.totalAmount - debt.remainingAmount);
  return {
    id: debt.id,
    name: debt.name,
    totalAmount: debt.totalAmount,
    remainingAmount: debt.remainingAmount,
    monthlyPayment: debt.monthlyPayment,
    dueDate: debt.dueDate,
    progress:
      debt.totalAmount > 0
        ? Math.min(100, (paid / debt.totalAmount) * 100)
        : 0,
  };
}

function savingsView(goal: SavingsGoalRecord) {
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

async function loadFinance(userId: string) {
  const db = await getMongoDb();
  const [profile, bills, debts, goals] = await Promise.all([
    db.collection<ProfileRecord>("profiles").findOne({ userId }),
    db
      .collection<BillRecord>("bills")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection<DebtRecord>("debts")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection<SavingsGoalRecord>("savings_goals")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);
  return { profile, bills, debts, goals };
}

router.get("/profile", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const db = await getMongoDb();
  const profile = await db.collection<ProfileRecord>("profiles").findOne({ userId });
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
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const db = await getMongoDb();
  const profiles = db.collection<ProfileRecord>("profiles");
  const now = new Date();
  await profiles.updateOne(
    { userId },
    [
      {
        $set: {
          userId,
          monthlyIncome:
            body.data.monthlyIncome ?? { $ifNull: ["$monthlyIncome", 0] },
          preferredCurrency:
            body.data.preferredCurrency ??
            { $ifNull: ["$preferredCurrency", "SAR"] },
          language:
            body.data.language ?? { $ifNull: ["$language", "en"] },
          theme: body.data.theme ?? { $ifNull: ["$theme", "light"] },
          createdAt: { $ifNull: ["$createdAt", now] },
          updatedAt: now,
        },
      },
    ],
    { upsert: true },
  );
  const profile = await profiles.findOne({ userId });
  res.json(
    UpdateProfileResponse.parse({
      displayName: null,
      monthlyIncome: profile?.monthlyIncome ?? 0,
      preferredCurrency: profile?.preferredCurrency ?? "SAR",
      language: profile?.language ?? "en",
      theme: profile?.theme ?? "light",
    }),
  );
});

router.get("/bills", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const db = await getMongoDb();
  const bills = await db
    .collection<BillRecord>("bills")
    .find({ userId })
    .sort({ dueDate: 1 })
    .toArray();
  res.json(ListBillsResponse.parse(bills.map(billView)));
});

router.post("/bills", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const body = CreateBillBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const db = await getMongoDb();
  const now = new Date();
  const bill: BillRecord = {
    id: await nextId("bills"),
    userId,
    name: body.data.name,
    amount: body.data.amount,
    dueDate: dateOnly(body.data.dueDate),
    frequency: body.data.frequency,
    paid: body.data.paid ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<BillRecord>("bills").insertOne(bill);
  res.status(201).json(CreateBillResponse.parse(billView(bill)));
});

router.patch("/bills/:id", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const params = UpdateBillParams.safeParse(req.params);
  const body = UpdateBillBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid bill update" });
    return;
  }
  const { dueDate, ...rest } = body.data;
  const db = await getMongoDb();
  const bills = db.collection<BillRecord>("bills");
  await bills.updateOne(
    { id: params.data.id, userId },
    {
      $set: {
        ...defined(rest),
        ...(dueDate ? { dueDate: dateOnly(dueDate) } : {}),
        updatedAt: new Date(),
      },
    },
  );
  const bill = await bills.findOne({ id: params.data.id, userId });
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  res.json(UpdateBillResponse.parse(billView(bill)));
});

router.delete("/bills/:id", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const params = DeleteBillParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const db = await getMongoDb();
  const result = await db
    .collection<BillRecord>("bills")
    .deleteOne({ id: params.data.id, userId });
  if (!result.deletedCount) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/debts", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const db = await getMongoDb();
  const debts = await db
    .collection<DebtRecord>("debts")
    .find({ userId })
    .sort({ dueDate: 1 })
    .toArray();
  res.json(ListDebtsResponse.parse(debts.map(debtView)));
});

router.post("/debts", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const body = CreateDebtBody.safeParse(req.body);
  if (!body.success || body.data.remainingAmount > body.data.totalAmount) {
    res.status(400).json({ error: "Invalid debt details" });
    return;
  }
  const db = await getMongoDb();
  const now = new Date();
  const debt: DebtRecord = {
    id: await nextId("debts"),
    userId,
    name: body.data.name,
    totalAmount: body.data.totalAmount,
    remainingAmount: body.data.remainingAmount,
    monthlyPayment: body.data.monthlyPayment,
    dueDate: dateOnly(body.data.dueDate),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<DebtRecord>("debts").insertOne(debt);
  res.status(201).json(CreateDebtResponse.parse(debtView(debt)));
});

router.patch("/debts/:id", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const params = UpdateDebtParams.safeParse(req.params);
  const body = UpdateDebtBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid debt update" });
    return;
  }
  const { dueDate, ...rest } = body.data;
  let invalidState = false;
  const debt = await withMongoTransaction(async (db, session) => {
    const debts = db.collection<DebtRecord>("debts");
    const existing = await debts.findOne(
      { id: params.data.id, userId },
      { session },
    );
    if (!existing) return null;
    const merged = {
      ...existing,
      ...defined(rest),
      ...(dueDate ? { dueDate: dateOnly(dueDate) } : {}),
    };
    if (merged.remainingAmount > merged.totalAmount) {
      invalidState = true;
      return null;
    }
    await debts.updateOne(
      { id: params.data.id, userId },
      {
        $set: {
          ...defined(rest),
          ...(dueDate ? { dueDate: dateOnly(dueDate) } : {}),
          updatedAt: new Date(),
        },
      },
      { session },
    );
    return debts.findOne({ id: params.data.id, userId }, { session });
  });
  if (invalidState) {
    res.status(400).json({ error: "Remaining debt cannot exceed total debt" });
    return;
  }
  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }
  res.json(UpdateDebtResponse.parse(debtView(debt)));
});

router.delete("/debts/:id", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const params = DeleteDebtParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const db = await getMongoDb();
  const result = await db
    .collection<DebtRecord>("debts")
    .deleteOne({ id: params.data.id, userId });
  if (!result.deletedCount) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/debts/:id/payments", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const params = RecordDebtPaymentParams.safeParse(req.params);
  const body = RecordDebtPaymentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid payment" });
    return;
  }
  const debt = await withMongoTransaction(async (db, session) => {
    const debts = db.collection<DebtRecord>("debts");
    const existing = await debts.findOne(
      { id: params.data.id, userId },
      { session },
    );
    if (!existing) return null;
    const payment = Math.min(body.data.amount, existing.remainingAmount);
    await debts.updateOne(
      { id: existing.id, userId },
      {
        $set: {
          remainingAmount: Math.max(0, existing.remainingAmount - payment),
          updatedAt: new Date(),
        },
      },
      { session },
    );
    await db.collection("debt_payments").insertOne(
      {
        id: await nextId("debt_payments", session),
        debtId: existing.id,
        userId,
        amount: payment,
        createdAt: new Date(),
      },
      { session },
    );
    return debts.findOne({ id: existing.id, userId }, { session });
  });
  if (!debt) {
    res.status(404).json({ error: "Debt not found" });
    return;
  }
  res.json(RecordDebtPaymentResponse.parse(debtView(debt)));
});

router.get("/savings-goals", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const db = await getMongoDb();
  const goals = await db
    .collection<SavingsGoalRecord>("savings_goals")
    .find({ userId })
    .sort({ targetDate: 1 })
    .toArray();
  res.json(ListSavingsGoalsResponse.parse(goals.map(savingsView)));
});

router.post("/savings-goals", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const body = CreateSavingsGoalBody.safeParse(req.body);
  if (!body.success || body.data.currentAmount > body.data.targetAmount) {
    res.status(400).json({ error: "Invalid savings goal" });
    return;
  }
  const db = await getMongoDb();
  const now = new Date();
  const goal: SavingsGoalRecord = {
    id: await nextId("savings_goals"),
    userId,
    name: body.data.name,
    targetAmount: body.data.targetAmount,
    currentAmount: body.data.currentAmount,
    targetDate: dateOnly(body.data.targetDate),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<SavingsGoalRecord>("savings_goals").insertOne(goal);
  res.status(201).json(CreateSavingsGoalResponse.parse(savingsView(goal)));
});

router.patch("/savings-goals/:id", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const params = UpdateSavingsGoalParams.safeParse(req.params);
  const body = UpdateSavingsGoalBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid savings goal update" });
    return;
  }
  const { targetDate, ...rest } = body.data;
  let invalidState = false;
  const goal = await withMongoTransaction(async (db, session) => {
    const goals = db.collection<SavingsGoalRecord>("savings_goals");
    const existing = await goals.findOne(
      { id: params.data.id, userId },
      { session },
    );
    if (!existing) return null;
    const merged = {
      ...existing,
      ...defined(rest),
      ...(targetDate ? { targetDate: dateOnly(targetDate) } : {}),
    };
    if (merged.currentAmount > merged.targetAmount) {
      invalidState = true;
      return null;
    }
    await goals.updateOne(
      { id: params.data.id, userId },
      {
        $set: {
          ...defined(rest),
          ...(targetDate ? { targetDate: dateOnly(targetDate) } : {}),
          updatedAt: new Date(),
        },
      },
      { session },
    );
    return goals.findOne({ id: params.data.id, userId }, { session });
  });
  if (invalidState) {
    res.status(400).json({ error: "Current savings cannot exceed the target" });
    return;
  }
  if (!goal) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  res.json(UpdateSavingsGoalResponse.parse(savingsView(goal)));
});

router.delete("/savings-goals/:id", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const params = DeleteSavingsGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const db = await getMongoDb();
  const result = await db
    .collection<SavingsGoalRecord>("savings_goals")
    .deleteOne({ id: params.data.id, userId });
  if (!result.deletedCount) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/savings-goals/:id/contributions", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const params = AddSavingsContributionParams.safeParse(req.params);
  const body = AddSavingsContributionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid contribution" });
    return;
  }
  const goal = await withMongoTransaction(async (db, session) => {
    const goals = db.collection<SavingsGoalRecord>("savings_goals");
    const existing = await goals.findOne(
      { id: params.data.id, userId },
      { session },
    );
    if (!existing) return null;
    const amount = Math.min(
      body.data.amount,
      Math.max(0, existing.targetAmount - existing.currentAmount),
    );
    await goals.updateOne(
      { id: existing.id, userId },
      {
        $set: {
          currentAmount: existing.currentAmount + amount,
          updatedAt: new Date(),
        },
      },
      { session },
    );
    await db.collection("savings_contributions").insertOne(
      {
        id: await nextId("savings_contributions", session),
        goalId: existing.id,
        userId,
        amount,
        createdAt: new Date(),
      },
      { session },
    );
    return goals.findOne({ id: existing.id, userId }, { session });
  });
  if (!goal) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }
  res.json(AddSavingsContributionResponse.parse(savingsView(goal)));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const { profile, bills, debts, goals } = await loadFinance(userId);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 7);
  const soonKey = soon.toISOString().slice(0, 10);
  const unpaid = bills.filter((bill) => !bill.paid);
  const currentSavings = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const savingsTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const recentActivity = [
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
  const nextBill = [...unpaid].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )[0];
  res.json(
    GetDashboardResponse.parse({
      monthlyIncome: profile?.monthlyIncome ?? 0,
      upcomingBills: unpaid.reduce((sum, bill) => sum + bill.amount, 0),
      totalRemainingDebt: debts.reduce(
        (sum, debt) => sum + debt.remainingAmount,
        0,
      ),
      currentSavings,
      savingsProgress:
        savingsTarget > 0 ? (currentSavings / savingsTarget) * 100 : 0,
      billsDueSoon: unpaid.filter(
        (bill) => bill.dueDate >= todayKey && bill.dueDate <= soonKey,
      ).length,
      nextBill: nextBill?.name ?? null,
      recentActivity,
    }),
  );
});

router.post("/assistant", async (req, res): Promise<void> => {
  const userId = await requireUserId(req, res);
  if (!userId) return;
  const body = AskFinancialAssistantBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  const { profile, bills, debts, goals } = await loadFinance(userId);
  const currency = profile?.preferredCurrency ?? "SAR";
  const language = body.data.language === "ar" ? "Arabic" : "English";
  const financeSnapshot = {
    currency,
    monthlyIncome: profile?.monthlyIncome ?? 0,
    bills: bills.map(({ name, amount, dueDate, frequency, paid }) => ({
      name,
      amount,
      dueDate,
      frequency,
      paid,
    })),
    debts: debts.map(
      ({ name, totalAmount, remainingAmount, monthlyPayment, dueDate }) => ({
        name,
        totalAmount,
        remainingAmount,
        monthlyPayment,
        dueDate,
      }),
    ),
    savingsGoals: goals.map(
      ({ name, targetAmount, currentAmount, targetDate }) => ({
        name,
        targetAmount,
        currentAmount,
        targetDate,
      }),
    ),
  };
  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are Mizan's personal financial organization assistant. Answer only from the supplied finance snapshot. Do not provide investment, legal, tax, lending, or professional financial advice. Do not invent missing values. Keep the answer concise, practical, and in ${language}. If the question is unrelated to the user's bills, debts, savings, income, or cash-flow organization, politely explain the scope.\n\nFinance snapshot:\n${JSON.stringify(financeSnapshot)}\n\nUser question:\n${body.data.question}`,
          },
        ],
      },
    ],
  });
  const answer =
    result.text?.trim() ||
    (body.data.language === "ar"
      ? "تعذر إنشاء إجابة الآن. حاول مرة أخرى."
      : "I could not create an answer right now. Please try again.");
  res.json(AskFinancialAssistantResponse.parse({ answer }));
});

export default router;