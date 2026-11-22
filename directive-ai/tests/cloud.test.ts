import test from "node:test";
import assert from "node:assert/strict";
import { cloudProvider } from "../server/src/providers/cloud.ts";

test("cloud model is selected by server configuration", async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => { requests.push(JSON.parse(options.body)); return { ok: true, async json() { return { choices: [{ message: { content: '{"actions":[{"tool":"setColor","args":{"color":"#123456"}}]}' } }] }; } }; };
  try {
    const input = { prompt: "Дом", canvas: { width: 800, height: 520 }, tools: ["setColor"] };
    const first = await cloudProvider({ baseUrl: "https://api.example/v1", apiKey: "test", model: "primary" }).generatePlan(input);
    const second = await cloudProvider({ baseUrl: "https://api.example/v1", apiKey: "test", model: "reserve" }).generatePlan(input);
    assert.deepEqual(first, second);
    assert.deepEqual(requests.map(request => request.model), ["primary", "reserve"]);
  } finally { globalThis.fetch = original; }
});
