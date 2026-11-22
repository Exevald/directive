import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateRequest, validatePlan } from "./schema.ts";
import { mockProvider } from "./providers/mock.ts";
import { cloudProvider } from "./providers/cloud.ts";

const config = {
  port: Number(process.env.PORT || 4242), provider: process.env.AI_PROVIDER || "mock",
  model: process.env.AI_MODEL || "", apiKey: process.env.AI_API_KEY || "",
  baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
  eventCode: process.env.EVENT_CODE || "", allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:8080").split(","),
  timeout: Number(process.env.GENERATION_TIMEOUT_MS || 20000), maxConcurrent: Number(process.env.MAX_CONCURRENT || 4),
  requestsPerMinute: Number(process.env.REQUESTS_PER_MINUTE || 4), maxSessions: Number(process.env.MAX_SESSIONS || 100)
};
const sessions = new Map(), rates = new Map();
let active = 0;
const provider = config.provider === "mock" ? mockProvider : cloudProvider(config);
const scriptPath = fileURLToPath(new URL("../../dist/artist.js", import.meta.url));

function json(res, status, body) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(body)); }
function failure(res, status, code, message) { json(res, status, { error: { code, message } }); }
function originAllowed(req) { const origin = req.headers.origin; return !origin || config.allowedOrigins.includes(origin); }
function cors(req, res) {
  if (!originAllowed(req)) return false;
  const origin = req.headers.origin;
  if (origin) { res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary", "Origin"); res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"); }
  return true;
}
async function body(req) {
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 8192) { const error = Error("Too large"); error.status = 413; throw error; } }
  try { return JSON.parse(raw); } catch { const error = Error("Invalid JSON"); error.status = 400; throw error; }
}
function identity(req) { return createHash("sha256").update(String(req.socket.remoteAddress)).digest("hex").slice(0, 16); }
function rate(key) { const now = Date.now(); const bucket = rates.get(key) || []; const recent = bucket.filter(t => now - t < 60000); if (recent.length >= config.requestsPerMinute) return false; recent.push(now); rates.set(key, recent); return true; }

export function createGateway() {
  return createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://local").pathname;
    if (!cors(req, res)) return failure(res, 403, "ORIGIN_DENIED", "Источник не разрешён");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    if (req.method === "GET" && pathname === "/healthz") return json(res, 200, { ok: true, provider: config.provider === "mock" ? "demo" : "cloud" });
    if (req.method === "GET" && pathname === "/artist/v1/artist.js") {
      try { const file = await readFile(scriptPath); res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600", "Content-Length": file.length }); res.end(file); }
      catch { failure(res, 503, "SCRIPT_UNAVAILABLE", "Плагин недоступен"); }
      return;
    }
    if (req.method !== "POST" || !["/v1/session", "/v1/draw"].includes(pathname)) return failure(res, 404, "NOT_FOUND", "Маршрут не найден");
    try {
      const input = await body(req);
      if (pathname === "/v1/session") {
        if (!config.eventCode || input?.code !== config.eventCode) return failure(res, 401, "UNAUTHORIZED", "Неверный код мероприятия");
        if (sessions.size >= config.maxSessions || !rate("session:" + identity(req))) return failure(res, 429, "RATE_LIMITED", "Лимит подключений");
        const token = randomUUID(); sessions.set(token, { expires: Date.now() + 2 * 60 * 60 * 1000, count: 0 });
        return json(res, 200, { token, expiresIn: 7200 });
      }
      const token = /^Bearer (.+)$/.exec(String(req.headers.authorization || ""))?.[1];
      const session = token && sessions.get(token);
      if (!session || session.expires < Date.now()) return failure(res, 401, "UNAUTHORIZED", "Нужен действующий код мероприятия");
      if (!rate("draw:" + token) || session.count >= 30) return failure(res, 429, "RATE_LIMITED", "Лимит запросов исчерпан");
      if (active >= config.maxConcurrent) return failure(res, 429, "RATE_LIMITED", "Сервис занят, повторите позже");
      const drawing = validateRequest(input);
      if (!drawing.tools.length) return failure(res, 400, "NO_TOOLS", "Нет доступных инструментов");
      if (config.provider !== "mock" && !config.apiKey) return failure(res, 503, "PROVIDER_UNAVAILABLE", "Модель не настроена");
      active++; session.count++;
      const started = Date.now(), generationId = randomUUID();
      try {
        const plan = await provider.generatePlan(drawing, AbortSignal.timeout(config.timeout));
        validatePlan(plan, drawing.canvas, drawing.tools);
        console.log(JSON.stringify({ generationId, provider: config.provider, model: config.model, status: "ok", durationMs: Date.now() - started, actions: plan.actions.length }));
        return json(res, 200, { schemaVersion: 1, generationId, mode: config.provider === "mock" ? "demo" : "cloud", actions: plan.actions });
      } catch (error) {
        const timeout = error.name === "TimeoutError" || error.name === "AbortError";
        console.error(JSON.stringify({ generationId, provider: config.provider, model: config.model, status: timeout ? "timeout" : "error", durationMs: Date.now() - started }));
        return failure(res, timeout ? 504 : 502, timeout ? "TIMEOUT" : "GENERATION_FAILED", timeout ? "Модель не ответила вовремя" : "Не удалось подготовить рисунок");
      } finally { active--; }
    } catch (error) { failure(res, error.status || 400, error.status === 413 ? "BODY_TOO_LARGE" : "INVALID_REQUEST", error.status === 413 ? "Слишком большой запрос" : "Неверный запрос"); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) createGateway().listen(config.port, "0.0.0.0", () => console.log(`directive-ai listening on ${config.port}`));
