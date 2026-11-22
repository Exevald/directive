import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validatePlan, validateRequest, type DrawingProvider } from "./schema.ts";
import { mockProvider } from "./providers/mock.ts";
import { cloudProvider } from "./providers/cloud.ts";

const config = {
  port: Number(process.env.PORT || 4242),
  provider: process.env.AI_PROVIDER || "mock",
  model: process.env.AI_MODEL || "",
  apiKey: process.env.AI_API_KEY || "",
  baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
  eventCode: process.env.EVENT_CODE || "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:8080").split(","),
  timeout: Number(process.env.GENERATION_TIMEOUT_MS || 20000),
  maxConcurrent: Number(process.env.MAX_CONCURRENT || 4),
  requestsPerMinute: Number(process.env.REQUESTS_PER_MINUTE || 4),
  maxSessions: Number(process.env.MAX_SESSIONS || 100),
};
interface Session {
  expires: number;
  count: number;
}
const sessions: Map<string, Session> = new Map<string, Session>();
const rates: Map<string, number[]> = new Map<string, number[]>();
let active: number = 0;
const provider: DrawingProvider = config.provider === "mock" ? mockProvider : cloudProvider(config);
const scriptPath = fileURLToPath(new URL("../../dist/artist.js", import.meta.url));

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function failure(res: ServerResponse, status: number, code: string, message: string): void {
  json(res, status, { error: { code, message } });
}

function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  return !origin || config.allowedOrigins.includes(origin);
}

function cors(req: IncomingMessage, res: ServerResponse): boolean {
  if (!originAllowed(req)) return false;
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return true;
}

async function body(req: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8192) {
      throw Object.assign(Error("Too large"), { status: 413 });
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(Error("Invalid JSON"), { status: 400 });
  }
}

function identity(req: IncomingMessage): string {
  return createHash("sha256").update(String(req.socket.remoteAddress)).digest("hex").slice(0, 16);
}

function rate(key: string): boolean {
  const now = Date.now();
  const bucket = rates.get(key) || [];
  const recent: number[] = bucket.filter((t: number): boolean => now - t < 60000);
  if (recent.length >= config.requestsPerMinute) return false;
  recent.push(now);
  rates.set(key, recent);
  return true;
}

function hasCode(value: unknown, code: string): boolean {
  return typeof value === "object" && value !== null && "code" in value && value.code === code;
}

function errorStatus(error: unknown): number {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : 400;
}

export function createGateway(): Server {
  return createServer(async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const pathname = new URL(req.url || "/", "http://local").pathname;
    if (!cors(req, res)) return failure(res, 403, "ORIGIN_DENIED", "Источник не разрешён");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "GET" && pathname === "/healthz")
      return json(res, 200, {
        ok: true,
        provider: config.provider === "mock" ? "demo" : "cloud",
      });
    if (req.method === "GET" && pathname === "/artist/v1/artist.js") {
      try {
        const file = await readFile(scriptPath);
        res.writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          "Content-Length": file.length,
        });
        res.end(file);
      } catch {
        failure(res, 503, "SCRIPT_UNAVAILABLE", "Плагин недоступен");
      }
      return;
    }
    if (req.method !== "POST" || !["/v1/session", "/v1/draw"].includes(pathname))
      return failure(res, 404, "NOT_FOUND", "Маршрут не найден");
    try {
      const input = await body(req);
      if (pathname === "/v1/session") {
        if (!config.eventCode || !hasCode(input, config.eventCode))
          return failure(res, 401, "UNAUTHORIZED", "Неверный код мероприятия");
        if (sessions.size >= config.maxSessions || !rate("session:" + identity(req)))
          return failure(res, 429, "RATE_LIMITED", "Лимит подключений");
        const token = randomUUID();
        sessions.set(token, { expires: Date.now() + 2 * 60 * 60 * 1000, count: 0 });
        return json(res, 200, { token, expiresIn: 7200 });
      }
      const token = /^Bearer (.+)$/.exec(String(req.headers.authorization || ""))?.[1];
      const session = token && sessions.get(token);
      if (!session || session.expires < Date.now())
        return failure(res, 401, "UNAUTHORIZED", "Нужен действующий код мероприятия");
      if (!rate("draw:" + token) || session.count >= 30)
        return failure(res, 429, "RATE_LIMITED", "Лимит запросов исчерпан");
      if (active >= config.maxConcurrent)
        return failure(res, 429, "RATE_LIMITED", "Сервис занят, повторите позже");
      const drawing = validateRequest(input);
      if (!drawing.tools.length) return failure(res, 400, "NO_TOOLS", "Нет доступных инструментов");
      if (config.provider !== "mock" && !config.apiKey)
        return failure(res, 503, "PROVIDER_UNAVAILABLE", "Модель не настроена");
      active++;
      session.count++;
      const started = Date.now(),
        generationId = randomUUID();
      try {
        const plan = validatePlan(
          await provider.generatePlan(drawing, AbortSignal.timeout(config.timeout)),
          drawing.canvas,
          drawing.tools,
        );
        console.log(
          JSON.stringify({
            generationId,
            provider: config.provider,
            model: config.model,
            status: "ok",
            durationMs: Date.now() - started,
            actions: plan.actions.length,
          }),
        );
        return json(res, 200, {
          schemaVersion: 1,
          generationId,
          mode: config.provider === "mock" ? "demo" : "cloud",
          actions: plan.actions,
        });
      } catch (error) {
        const timeout: boolean =
          error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
        console.error(
          JSON.stringify({
            generationId,
            provider: config.provider,
            model: config.model,
            status: timeout ? "timeout" : "error",
            durationMs: Date.now() - started,
          }),
        );
        return failure(
          res,
          timeout ? 504 : 502,
          timeout ? "TIMEOUT" : "GENERATION_FAILED",
          timeout ? "Модель не ответила вовремя" : "Не удалось подготовить рисунок",
        );
      } finally {
        active--;
      }
    } catch (error) {
      const status: number = errorStatus(error);
      failure(
        res,
        status,
        status === 413 ? "BODY_TOO_LARGE" : "INVALID_REQUEST",
        status === 413 ? "Слишком большой запрос" : "Неверный запрос",
      );
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  createGateway().listen(config.port, "0.0.0.0", () =>
    console.log(`directive-ai listening on ${config.port}`),
  );
