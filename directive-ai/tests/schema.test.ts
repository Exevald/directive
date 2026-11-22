import test from "node:test";
import assert from "node:assert/strict";
import { validateRequest, validatePlan } from "../server/src/schema.ts";
const canvas = { width: 800, height: 520 };
const request = {
  schemaVersion: 1,
  prompt: "Дом",
  canvas,
  tools: ["setColor", "drawLine", "unknown"],
};
test("request intersects client tools with fixed allowlist", () =>
  assert.deepEqual(validateRequest(request).tools, ["setColor", "drawLine"]));
test("rejects incompatible request version", () =>
  assert.throws(() => validateRequest({ ...request, schemaVersion: 2 })));
test("validates named action arguments strictly", () => {
  const valid = { actions: [{ tool: "drawLine", args: { x1: 1, y1: 2, x2: 3, y2: 4 } }] };
  assert.deepEqual(validatePlan(valid, canvas, ["drawLine"]), valid);
  assert.throws(() =>
    validatePlan(
      { actions: [{ tool: "drawLine", args: { x1: 1, y1: 2, x2: 3, y2: 4, extra: 1 } }] },
      canvas,
      ["drawLine"],
    ),
  );
  assert.throws(() =>
    validatePlan({ actions: [{ tool: "setColor", args: { color: "red" } }] }, canvas, ["setColor"]),
  );
  assert.throws(() =>
    validatePlan({ actions: [{ tool: "setSize", args: { size: Infinity } }] }, canvas, ["setSize"]),
  );
  assert.throws(() =>
    validatePlan({ actions: [{ tool: "unknown", args: {} }] }, canvas, ["unknown"]),
  );
  assert.throws(() => validatePlan({ actions: [] }, canvas, ["drawLine"]));
  assert.throws(() =>
    validatePlan({ actions: Array(81).fill(valid.actions[0]) }, canvas, ["drawLine"]),
  );
});
