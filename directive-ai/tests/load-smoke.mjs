import assert from "node:assert/strict";
process.env.EVENT_CODE = "load-test-code";
process.env.AI_PROVIDER = "mock";
process.env.MOCK_DELAY_MS = "100";
process.env.REQUESTS_PER_MINUTE = "100";
process.env.MAX_CONCURRENT = "4";
const { createGateway } = await import("../server/src/http.ts");
const server = createGateway();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const headers = { "Content-Type": "application/json" };
  const login = await fetch(base + "/v1/session", {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "load-test-code" }),
  });
  const { token } = await login.json();
  const request = {
    schemaVersion: 1,
    prompt: "Дом",
    canvas: { width: 800, height: 520 },
    tools: ["drawLine", "myBrush"],
  };
  const responses = await Promise.all(
    Array.from({ length: 30 }, () =>
      fetch(base + "/v1/draw", {
        method: "POST",
        headers: { ...headers, Authorization: `Bearer ${token}` },
        body: JSON.stringify(request),
      }),
    ),
  );
  const counts = responses.reduce((result, response) => {
    result[response.status] = (result[response.status] || 0) + 1;
    return result;
  }, {});
  assert.equal(counts[200], 4);
  assert.equal(counts[429], 26);
  console.log("30 parallel requests:", counts);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
