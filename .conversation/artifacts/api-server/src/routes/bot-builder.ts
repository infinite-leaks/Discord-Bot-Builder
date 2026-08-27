import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import {
  activityTable,
  botFilesTable,
  botsTable,
  toolsTable,
} from "@workspace/db/schema";
import {
  GetAuthStatusResponse,
  GetDashboardSummaryResponse,
  LoginBody,
  LoginResponse,
  ListActivityResponse,
  ListBotsResponse,
  ListToolsResponse,
  ReadBotFileQueryParams,
  ReadBotFileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const sessions = new Set<string>();
const sessionsById = new Map<string, string>();

const tools = [
  ["workspace-files", "Workspace files", "Read, write, and patch specific lines without replacing whole files.", "workspace"],
  ["discord-api", "Discord API assistant", "Plan safe Discord API operations with approval gates for mutations.", "discord"],
  ["error-doctor", "Error doctor", "Inspect stack traces, explain root causes, and propose small fixes.", "skills"],
  ["bot-scaffolder", "Bot scaffolder", "Generate Replit-ready projects for popular Discord libraries.", "skills"],
  ["test-runner", "Test runner", "Run focused checks and surface logs before a bot is started.", "quality"],
];

function encryptionKey() {
  return crypto.createHash("sha256").update(process.env.SESSION_SECRET ?? "dev-only-change-me").digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}

function decrypt(value: string) {
  const [ivHex, tagHex, dataHex] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

function cookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 12 };
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.cookies?.bot_builder_session as string | undefined;
  if (!session || !sessions.has(session)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

function botView(bot: typeof botsTable.$inferSelect) {
  return {
    id: bot.id, name: bot.name, description: bot.description, framework: bot.framework,
    language: bot.language, status: bot.status, tokenConfigured: Boolean(bot.encryptedToken),
    presence: bot.presence, lastActivity: bot.lastActivity.toISOString(), updatedAt: bot.updatedAt.toISOString(),
  };
}

function fileView(file: typeof botFilesTable.$inferSelect) {
  return { path: file.path, kind: "file" as const, size: file.size, language: file.language };
}

async function activity(type: string, title: string, detail: string, botId?: string) {
  await db.insert(activityTable).values({ id: crypto.randomUUID(), type, title, detail, botId }).catch(() => undefined);
}

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  const username = process.env.BOT_BUILDER_ADMIN_USERNAME;
  const password = process.env.BOT_BUILDER_ADMIN_PASSWORD;
  if (!parsed.success || !username || !password ||
      parsed.data.username !== username || parsed.data.password !== password) {
    res.status(401).json({ authenticated: false, username: null });
    return;
  }
  const session = crypto.randomBytes(32).toString("hex");
  sessions.add(session);
  sessionsById.set(session, username);
  res.cookie("bot_builder_session", session, cookieOptions()).json(LoginResponse.parse({ authenticated: true, username }));
});

router.post("/auth/logout", (req, res) => {
  const session = req.cookies?.bot_builder_session as string | undefined;
  if (session) { sessions.delete(session); sessionsById.delete(session); }
  res.clearCookie("bot_builder_session").json({ authenticated: false, username: null });
});

router.get("/auth/me", (req, res) => {
  const session = req.cookies?.bot_builder_session as string | undefined;
  const username = session ? sessionsById.get(session) : undefined;
  res.json(GetAuthStatusResponse.parse({ authenticated: Boolean(username), username: username ?? null }));
});

router.use(requireAdmin);

router.get("/dashboard/summary", async (_req, res) => {
  const [bots, files, toolCount] = await Promise.all([
    db.select().from(botsTable),
    db.select({ count: sql<number>`count(*)` }).from(botFilesTable),
    db.select({ count: sql<number>`count(*)` }).from(toolsTable),
  ]);
  const ollamaHost = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
  const searchHost = process.env.SEARCH_API_BASE ?? "https://traffic-capture.globalstats.xyz";
  const probe = async (url: string) => {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); return response.ok ? "online" : "degraded"; }
    catch { return "offline"; }
  };
  const [ollama, search] = await Promise.all([probe(`${ollamaHost.replace(/\/$/, "")}/api/tags`), probe(`${searchHost.replace(/\/$/, "")}/search?q=discord&max_results=1`)]);
  res.json(GetDashboardSummaryResponse.parse({
    totalBots: bots.length,
    runningBots: bots.filter((bot) => bot.status === "running").length,
    filesManaged: Number(files[0]?.count ?? 0),
    toolCount: Number(toolCount[0]?.count ?? tools.length),
    providers: { discord: bots.some((bot) => bot.encryptedToken) ? "ready" : "not configured", ollama, search },
  }));
});

router.get("/bots", async (_req, res) => {
  const bots = await db.select().from(botsTable).orderBy(desc(botsTable.updatedAt));
  res.json(ListBotsResponse.parse(bots.map(botView)));
});

router.post("/bots", async (req, res) => {
  const { name, description = "", framework, language } = req.body ?? {};
  if (!name || !framework || !language) { res.status(400).json({ error: "name, framework, and language are required" }); return; }
  const now = new Date();
  const id = crypto.randomUUID();
  const [bot] = await db.insert(botsTable).values({ id, name, description, framework, language, createdAt: now, updatedAt: now, lastActivity: now }).returning();
  await db.insert(toolsTable).values(tools.map(([toolId, toolName, toolDescription, category]) => ({ id: `${id}-${toolId}`, name: toolName, description: toolDescription, category, enabled: true }))).onConflictDoNothing();
  await activity("bot", "Bot project created", `${name} is ready for files and commands.`, id);
  res.status(201).json(botView(bot));
});

router.get("/bots/:id", async (req, res) => {
  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, req.params.id));
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const files = await db.select().from(botFilesTable).where(eq(botFilesTable.botId, bot.id));
  res.json({ ...botView(bot), files: files.map(fileView) });
});

router.patch("/bots/:id", async (req, res) => {
  const [bot] = await db.update(botsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(botsTable.id, req.params.id)).returning();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  await activity("bot", "Bot settings updated", `${bot.name} settings were saved.`, bot.id);
  res.json(botView(bot));
});

router.delete("/bots/:id", async (req, res) => {
  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, req.params.id));
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  await db.delete(botFilesTable).where(eq(botFilesTable.botId, bot.id));
  await db.delete(botsTable).where(eq(botsTable.id, bot.id));
  await activity("bot", "Bot project deleted", `${bot.name} and its encrypted token were removed.`, bot.id);
  res.json({ ok: true });
});

router.post("/bots/:id/start", async (req, res) => {
  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, req.params.id));
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  if (!bot.encryptedToken) { res.status(400).json({ error: "Add a Discord token before starting this bot." }); return; }
  const [updated] = await db.update(botsTable).set({ status: "running", updatedAt: new Date(), lastActivity: new Date() }).where(eq(botsTable.id, bot.id)).returning();
  await activity("runtime", "Bot started", `${bot.name} is marked online and ready for its configured runner.`, bot.id);
  res.json(botView(updated));
});

router.post("/bots/:id/stop", async (req, res) => {
  const [updated] = await db.update(botsTable).set({ status: "stopped", updatedAt: new Date(), lastActivity: new Date() }).where(eq(botsTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Bot not found" }); return; }
  await activity("runtime", "Bot stopped", `${updated.name} was stopped.`, updated.id);
  res.json(botView(updated));
});

router.put("/bots/:id/token", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (token.length < 10) { res.status(400).json({ error: "A valid Discord token is required." }); return; }
  const [updated] = await db.update(botsTable).set({ encryptedToken: encrypt(token), updatedAt: new Date() }).where(eq(botsTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Bot not found" }); return; }
  await activity("security", "Discord token secured", `${updated.name} token was encrypted and stored.`, updated.id);
  res.json({ configured: true, masked: `${token.slice(0, 5)}••••${token.slice(-4)}` });
});

router.delete("/bots/:id/token", async (req, res) => {
  const [updated] = await db.update(botsTable).set({ encryptedToken: null, status: "stopped", updatedAt: new Date() }).where(eq(botsTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Bot not found" }); return; }
  await activity("security", "Discord token deleted", `${updated.name} token was permanently removed.`, updated.id);
  res.json({ configured: false, masked: null });
});

router.get("/bots/:id/files", async (req, res) => {
  const files = await db.select().from(botFilesTable).where(eq(botFilesTable.botId, req.params.id));
  res.json(files.map(fileView));
});

router.get("/bots/:id/file", async (req, res) => {
  const query = ReadBotFileQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "path is required" }); return; }
  const [file] = await db.select().from(botFilesTable).where(and(eq(botFilesTable.botId, req.params.id), eq(botFilesTable.path, query.data.path)));
  if (!file) { res.status(404).json({ error: "File not found" }); return; }
  const lines = file.content.split("\n");
  const startLine = Math.max(1, Number(query.data.startLine ?? 1));
  const endLine = Math.min(lines.length, Number(query.data.endLine ?? lines.length));
  res.json(ReadBotFileResponse.parse({ path: file.path, content: lines.slice(startLine - 1, endLine).join("\n"), startLine, endLine, totalLines: lines.length }));
});

router.put("/bots/:id/file", async (req, res) => {
  const { path, content, startLine, endLine } = req.body ?? {};
  if (typeof path !== "string" || typeof content !== "string") { res.status(400).json({ error: "path and content are required" }); return; }
  const [existing] = await db.select().from(botFilesTable).where(and(eq(botFilesTable.botId, req.params.id), eq(botFilesTable.path, path)));
  let nextContent = content;
  if (existing && startLine != null && endLine != null) {
    const lines = existing.content.split("\n");
    lines.splice(Number(startLine) - 1, Number(endLine) - Number(startLine) + 1, ...content.split("\n"));
    nextContent = lines.join("\n");
  }
  const language = path.split(".").pop() ?? "text";
  const values = { id: existing?.id ?? crypto.randomUUID(), botId: req.params.id, path, content: nextContent, language, size: Buffer.byteLength(nextContent), updatedAt: new Date() };
  const [saved] = existing ? await db.update(botFilesTable).set(values).where(eq(botFilesTable.id, existing.id)).returning() : await db.insert(botFilesTable).values(values).returning();
  await db.update(botsTable).set({ updatedAt: new Date(), lastActivity: new Date() }).where(eq(botsTable.id, req.params.id));
  await activity("file", "File saved", `${path} was updated${startLine != null ? ` on lines ${startLine}-${endLine}` : ""}.`, req.params.id);
  const lines = saved.content.split("\n");
  res.json({ path: saved.path, content: saved.content, startLine: 1, endLine: lines.length, totalLines: lines.length });
});

router.get("/activity", async (_req, res) => {
  const rows = await db.select().from(activityTable).orderBy(desc(activityTable.createdAt)).limit(25);
  res.json(ListActivityResponse.parse(rows.map((row) => ({ id: row.id, type: row.type, title: row.title, detail: row.detail, createdAt: row.createdAt.toISOString() }))));
});

router.get("/tools", async (_req, res) => {
  const rows = await db.select().from(toolsTable);
  const data = rows.length ? rows : tools.map(([id, name, description, category]) => ({ id, name, description, category, enabled: true }));
  res.json(ListToolsResponse.parse(data));
});

export default router;