import test from "node:test";
import assert from "node:assert/strict";
process.env.EVENT_CODE = "test-event-code";
process.env.ALLOWED_ORIGINS = "http://127.0.0.1:8080";
process.env.AI_PROVIDER = "mock";
const { createGateway } = await import("../server/src/http.ts");

test("session, CORS and mock drawing complete through HTTP", async () => {
  const server = createGateway();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { "Content-Type": "application/json", Origin: "http://127.0.0.1:8080" };
  try {
    const preflight = await fetch(base + "/v1/draw", { method: "OPTIONS", headers });
    assert.equal(preflight.status, 204);
    const denied = await fetch(base + "/v1/session", { method: "POST", headers, body: JSON.stringify({ code: "wrong" }) });
    assert.equal(denied.status, 401);
    const session = await fetch(base + "/v1/session", { method: "POST", headers, body: JSON.stringify({ code: "test-event-code" }) });
    assert.equal(session.status, 200);
    const { token } = await session.json();
    const draw = await fetch(base + "/v1/draw", { method: "POST", headers: { ...headers, Authorization: `Bearer ${token}` }, body: JSON.stringify({ schemaVersion: 1, prompt: "Дом", canvas: { width: 800, height: 520 }, tools: ["setColor", "drawLine", "myBrush"] }) });
    assert.equal(draw.status, 200);
    const plan = await draw.json();
    assert.equal(plan.schemaVersion, 1);
    assert.equal(plan.mode, "demo");
    assert.ok(plan.actions.some(action => action.tool === "myBrush"));
    const tooLarge = await fetch(base + "/v1/draw", { method: "POST", headers: { ...headers, Authorization: `Bearer ${token}` }, body: JSON.stringify({ data: "x".repeat(9000) }) });
    assert.equal(tooLarge.status, 413);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
