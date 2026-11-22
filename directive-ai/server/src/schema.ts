export const tools = Object.freeze({
  setColor: ["color"], setSize: ["size"], drawLine: ["x1", "y1", "x2", "y2"],
  drawCircle: ["x", "y", "radius"], fillCircle: ["x", "y", "radius"],
  drawRectangle: ["x", "y", "width", "height"], myBrush: ["x1", "y1", "x2", "y2"]
});
const own = (value, key) => Object.hasOwn(value, key);
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => own(value, key));
const number = value => typeof value === "number" && Number.isFinite(value);
const integer = value => Number.isInteger(value);

export function validateRequest(value) {
  if (!exact(value, ["schemaVersion", "prompt", "canvas", "tools"]) || value.schemaVersion !== 1) throw Error("Неверная версия или структура запроса");
  if (typeof value.prompt !== "string" || !value.prompt.trim() || value.prompt.length > 500) throw Error("Описание должно содержать 1–500 символов");
  if (!exact(value.canvas, ["width", "height"]) || !integer(value.canvas.width) || !integer(value.canvas.height) || value.canvas.width < 1 || value.canvas.height < 1 || value.canvas.width > 4096 || value.canvas.height > 4096) throw Error("Неверный размер холста");
  if (!Array.isArray(value.tools) || value.tools.length > 7 || !value.tools.every(name => typeof name === "string")) throw Error("Неверный список инструментов");
  return { ...value, tools: [...new Set(value.tools.filter(name => own(tools, name)))], prompt: value.prompt.trim() };
}

export function validatePlan(value, canvas, allowed) {
  if (!exact(value, ["actions"]) || !Array.isArray(value.actions) || !value.actions.length || value.actions.length > 80) throw Error("Неверный план рисования");
  for (const action of value.actions) {
    if (!exact(action, ["tool", "args"]) || !own(tools, action.tool) || !allowed.includes(action.tool) || !exact(action.args, tools[action.tool])) throw Error("Недопустимая команда");
    for (const [key, val] of Object.entries(action.args)) {
      if (key === "color") { if (typeof val !== "string" || !/^#[0-9a-fA-F]{6}$/.test(val)) throw Error("Неверный цвет"); continue; }
      if (!number(val)) throw Error("Аргумент должен быть конечным числом");
      if (key === "size") { if (val < 1 || val > 80) throw Error("Неверный размер кисти"); continue; }
      if (key === "radius") { if (val < 0 || val > Math.max(canvas.width, canvas.height)) throw Error("Неверный радиус"); continue; }
      const limit = key === "x" || key === "x1" || key === "x2" || key === "width" ? canvas.width : canvas.height;
      if (val < -limit || val > limit * 2) throw Error("Координата вне безопасного диапазона");
    }
  }
  return value;
}
