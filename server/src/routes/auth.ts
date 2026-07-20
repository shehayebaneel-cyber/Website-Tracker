import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import {
  AUTH_COOKIE,
  cookieOptions,
  signSession,
  verifyPassword,
} from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email or password" });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Constant-ish response to avoid leaking which emails exist.
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = signSession({ uid: user.id, role: user.role, email: user.email });
  res.cookie(AUTH_COOKIE, token, cookieOptions);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.uid } });
  if (!user || !user.active) return res.status(401).json({ error: "Not authenticated" });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export default router;
