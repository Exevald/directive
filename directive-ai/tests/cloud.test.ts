import test from "node:test";
import assert from "node:assert/strict";
import {cloudProvider} from "../server/src/providers/cloud.ts";
import type {DrawingRequest} from "../server/src/schema.ts";

test("cloud model is selected by server configuration", async (): Promise<void> => {
  const original: typeof fetch = globalThis.fetch;
  const requests: Array<{ model: string }> = [];
  globalThis.fetch = async (
    _url: string | URL | Request,
    options?: RequestInit,
  ): Promise<Response> => {
    const request: unknown = JSON.parse(String(options?.body));
    if (
      typeof request !== "object" ||
      request === null ||
      !("model" in request) ||
      typeof request.model !== "string"
    )
      throw Error("Missing model");
    requests.push({model: request.model});
    return new Response(
      JSON.stringify({
        choices: [
          {message: {content: '{"actions":[{"tool":"setColor","args":{"color":"#123456"}}]}'}},
        ],
      }),
      {status: 200},
    );
  };
  try {
    const input: DrawingRequest = {
      schemaVersion: 1,
      prompt: "Дом",
      canvas: {width: 800, height: 520},
      tools: ["setColor"],
    };
    const first = await cloudProvider({
      baseUrl: "https://api.example/v1",
      apiKey: "test",
      model: "primary",
    }).generatePlan(input, new AbortController().signal);
    const second = await cloudProvider({
      baseUrl: "https://api.example/v1",
      apiKey: "test",
      model: "reserve",
    }).generatePlan(input, new AbortController().signal);
    assert.deepEqual(first, second);
    assert.deepEqual(
      requests.map((request: { model: string }): string => request.model),
      ["primary", "reserve"],
    );
  } finally {
    globalThis.fetch = original;
  }
});
