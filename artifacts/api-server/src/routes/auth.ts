import { Router, type IRouter } from "express";
import {
  clearSession,
  createUserId,
  getSessionUser,
  hashPassword,
  setSession,
  type UserRecord,
  verifyPassword,
} from "../lib/auth";
import { getMongoDb } from "../lib/mongo";

const router: IRouter = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();
const dummyPasswordHash = hashPassword("mizan-dummy-password");

function allowAttempt(key: string, limit: number): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

function credentials(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return null;
  if (password.length < 6) return null;
  return { email: normalizedEmail, password };
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const input = credentials(req.body);
  if (!input) {
    res.status(400).json({
      error: "Enter a valid email and a password with at least 6 characters.",
    });
    return;
  }
  if (!allowAttempt(`signup:${req.ip}`, 10)) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }
  const db = await getMongoDb();
  const users = db.collection<UserRecord>("users");
  await users.createIndex({ email: 1 }, { unique: true });
  if (await users.findOne({ email: input.email })) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }
  const user: UserRecord = {
    id: createUserId(),
    email: input.email,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date(),
  };
  try {
    await users.insertOne(user);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    throw error;
  }
  await setSession(res, user.id);
  res.status(201).json({ user: { id: user.id, email: user.email } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const input = credentials(req.body);
  if (!input) {
    res.status(400).json({ error: "Invalid email or password." });
    return;
  }
  if (!allowAttempt(`login:${req.ip}:${input.email}`, 5)) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }
  const db = await getMongoDb();
  const user = await db
    .collection<UserRecord>("users")
    .findOne({ email: input.email });
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await dummyPasswordHash),
  );
  if (!user || !passwordMatches) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  await setSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email } });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await clearSession(req, res);
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) {
    res.json({ user: null });
    return;
  }
  res.json({ user: { id: user.id, email: user.email } });
});

export default router;