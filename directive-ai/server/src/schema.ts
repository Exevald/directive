export interface CanvasSize {
  width: number;
  height: number;
}

export const tools = {
  setColor: ["color"],
  setSize: ["size"],
  drawLine: ["x1", "y1", "x2", "y2"],
  drawCircle: ["x", "y", "radius"],
  fillCircle: ["x", "y", "radius"],
  drawRectangle: ["x", "y", "width", "height"],
  myBrush: ["x1", "y1", "x2", "y2"],
} as const;

export type ToolName = keyof typeof tools;
export interface DrawingRequest {
  schemaVersion: 1;
  prompt: string;
  canvas: CanvasSize;
  tools: ToolName[];
}
export interface DrawingAction {
  tool: ToolName;
  args: Record<string, string | number>;
}
export interface DrawingPlan {
  actions: DrawingAction[];
}
export interface DrawingProvider {
  generatePlan(input: DrawingRequest, signal: AbortSignal): Promise<unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    isObject(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key: string): boolean => Object.hasOwn(value, key))
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isToolName(value: string): value is ToolName {
  return Object.hasOwn(tools, value);
}

export function validateRequest(value: unknown): DrawingRequest {
  if (!exact(value, ["schemaVersion", "prompt", "canvas", "tools"]) || value.schemaVersion !== 1)
    throw Error("Неверная версия или структура запроса");
  if (typeof value.prompt !== "string" || !value.prompt.trim() || value.prompt.length > 500)
    throw Error("Описание должно содержать 1–500 символов");
  const canvas: unknown = value.canvas;
  if (
    !exact(canvas, ["width", "height"]) ||
    !Number.isInteger(canvas.width) ||
    !Number.isInteger(canvas.height) ||
    !isNumber(canvas.width) ||
    !isNumber(canvas.height) ||
    canvas.width < 1 ||
    canvas.height < 1 ||
    canvas.width > 4096 ||
    canvas.height > 4096
  )
    throw Error("Неверный размер холста");
  if (
    !Array.isArray(value.tools) ||
    value.tools.length > 7 ||
    !value.tools.every((name: unknown): boolean => typeof name === "string")
  )
    throw Error("Неверный список инструментов");
  const names: string[] = value.tools as string[];
  return {
    schemaVersion: 1,
    prompt: value.prompt.trim(),
    canvas: { width: canvas.width, height: canvas.height },
    tools: [...new Set(names.filter(isToolName))],
  };
}

export function validatePlan(
  value: unknown,
  canvas: CanvasSize,
  allowed: readonly string[],
): DrawingPlan {
  if (
    !exact(value, ["actions"]) ||
    !Array.isArray(value.actions) ||
    !value.actions.length ||
    value.actions.length > 80
  )
    throw Error("Неверный план рисования");
  const actions: DrawingAction[] = [];
  for (const candidate of value.actions as unknown[]) {
    if (
      !exact(candidate, ["tool", "args"]) ||
      typeof candidate.tool !== "string" ||
      !isToolName(candidate.tool) ||
      !allowed.includes(candidate.tool) ||
      !exact(candidate.args, tools[candidate.tool])
    )
      throw Error("Недопустимая команда");
    const args: Record<string, string | number> = {};
    for (const [key, val] of Object.entries(candidate.args)) {
      if (key === "color") {
        if (typeof val !== "string" || !/^#[0-9a-fA-F]{6}$/.test(val)) throw Error("Неверный цвет");
        args[key] = val;
        continue;
      }
      if (!isNumber(val)) throw Error("Аргумент должен быть конечным числом");
      if (key === "size" && (val < 1 || val > 80)) throw Error("Неверный размер кисти");
      if (key === "radius" && (val < 0 || val > Math.max(canvas.width, canvas.height)))
        throw Error("Неверный радиус");
      if (key !== "size" && key !== "radius") {
        const limit: number =
          key === "x" || key === "x1" || key === "x2" || key === "width"
            ? canvas.width
            : canvas.height;
        if (val < -limit || val > limit * 2) throw Error("Координата вне безопасного диапазона");
      }
      args[key] = val;
    }
    actions.push({ tool: candidate.tool, args });
  }
  return { actions };
}
