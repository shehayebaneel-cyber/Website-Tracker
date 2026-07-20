import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { hashPassword } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();
const ROLES = ["OWNER", "STAFF", "DEVELOPER"];

function publicUser(u: any) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt };
}

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  res.json({ users: users.map(publicUser) });
});

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["OWNER", "STAFF", "DEVELOPER"]),
  password: z.string().min(8),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: "A user with that email already exists" });
  const user = await prisma.user.create({
    data: { email, name: parsed.data.name, role: parsed.data.role, passwordHash: await hashPassword(parsed.data.password) },
  });
  await logActivity(req, "User", user.id, "create", `Created ${user.role} user ${user.email}`);
  res.status(201).json({ user: publicUser(user) });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["OWNER", "STAFF", "DEVELOPER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data" });
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found" });

  // Guardrails: can't demote/deactivate the last active owner or yourself out of owner
  if ((parsed.data.role && parsed.data.role !== "OWNER") || parsed.data.active === false) {
    if (target.role === "OWNER") {
      const owners = await prisma.user.count({ where: { role: "OWNER", active: true } });
      if (owners <= 1) return res.status(409).json({ error: "Cannot remove the last active owner" });
    }
  }

  const data: any = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.update({ where: { id: target.id }, data });
  await logActivity(req, "User", user.id, "update", `Updated user ${user.email}`);
  res.json({ user: publicUser(user) });
});

export default router;
