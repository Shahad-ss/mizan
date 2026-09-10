import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { getMongoDb } from "./mongo";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "mizan_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

interface SessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createUserId(): string {
  return randomUUID();
}

export async function setSession(res: Response, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_AGE_SECONDS * 1000);
  const db = await getMongoDb();
  const sessions = db.collection<SessionRecord>("sessions");
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await sessions.insertOne({
    tokenHash: tokenHash(token),
    userId,
    expiresAt,
    createdAt: now,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_AGE_SECONDS * 1000,
    path: "/",
  });
}

export async function clearSession(
  req: Request,
  res: Response,
): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];
  if (typeof token === "string") {
    const db = await getMongoDb();
    await db
      .collection<SessionRecord>("sessions")
      .deleteOne({ tokenHash: tokenHash(token) });
  }
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function getSessionUserId(req: Request): Promise<string | null> {
  const token = req.cookies?.[COOKIE_NAME];
  if (typeof token !== "string") return null;
  const db = await getMongoDb();
  const session = await db.collection<SessionRecord>("sessions").findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
  return session?.userId ?? null;
}

export async function getSessionUser(req: Request): Promise<UserRecord | null> {
  const id = await getSessionUserId(req);
  if (!id) return null;
  const db = await getMongoDb();
  return db.collection<UserRecord>("users").findOne({ id });
}