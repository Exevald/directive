import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const script = await readFile(new URL("../dist/artist.js", import.meta.url), "utf8");

test("plugin executes a plan through the modified student myBrush", async (): Promise<void> => {
  const calls: Array<[number, number, number, number, string]> = [];
  const form: { onsubmit?: (event: { preventDefault(): void }) => Promise<void> } = {};
  const status = { textContent: "" };
  const input = { value: "Дом" };
  const submit = { disabled: false },
    cancel = { disabled: false };
  const shadow = {
    innerHTML: "",
    querySelector(selector: string): unknown {
      const elements: Record<string, unknown> = {
        form,
        input,
        'button[type="submit"]': submit,
        "#cancel": cancel,
        "#status": status,
      };
      return elements[selector];
    },
  };
  const canvas = { width: 800, height: 520, parentElement: { insertAdjacentElement() {} } };
  const document = {
    readyState: "complete",
    currentScript: {
      src: "https://artist.example/artist/v1/artist.js",
      dataset: { eventCode: "test" },
    },
    getElementById(id: string): typeof canvas | null {
      return id === "canvas" ? canvas : null;
    },
    createElement() {
      return {
        attachShadow() {
          return shadow;
        },
      };
    },
  };
  const window = {
    prompt() {
      return "test";
    },
    setColor() {},
    setSize() {},
    drawLine() {},
    drawCircle() {},
    fillCircle() {},
    drawRectangle() {},
    myBrush(x1: number, y1: number, x2: number, y2: number): void {
      calls.push([x1, y1, x2, y2, "student version"]);
    },
  };
  const fetch = async (url: string): Promise<{ ok: boolean; json(): Promise<unknown> }> => ({
    ok: true,
    async json(): Promise<unknown> {
      return url.endsWith("/v1/session")
        ? { token: "temporary" }
        : {
            schemaVersion: 1,
            mode: "demo",
            actions: [{ tool: "myBrush", args: { x1: 1, y1: 2, x2: 3, y2: 4 } }],
          };
    },
  });
  const context = vm.createContext({ window, document, fetch, AbortController, URL, setTimeout });
  vm.runInContext(script, context);
  assert.ok(form.onsubmit);
  await form.onsubmit({ preventDefault(): void {} });
  assert.deepEqual(calls, [[1, 2, 3, 4, "student version"]]);
  assert.match(status.textContent, /Демо-режим/);
  vm.runInContext(script, context);
  assert.equal(
    (window as typeof window & { __directiveArtistV1?: boolean }).__directiveArtistV1,
    true,
  );
});
