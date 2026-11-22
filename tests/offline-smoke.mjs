import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("four-file editor draws and exports without network", async () => {
  const html = await readFile(new URL("../starter/index.html", import.meta.url), "utf8");
  const editor = await readFile(new URL("../starter/editor.js", import.meta.url), "utf8");
  const brushes = await readFile(new URL("../starter/brushes.js", import.meta.url), "utf8");
  assert.deepEqual(
    [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]),
    ["editor.js", "brushes.js"],
  );
  const calls = [];
  const context2d = new Proxy(
    {},
    {
      get(target, key) {
        if (key === "arc" || key === "lineTo" || key === "stroke" || key === "clearRect")
          return (...args) => calls.push([key, ...args]);
        return target[key] || (() => {});
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    },
  );
  const canvas = {
    width: 800,
    height: 520,
    getContext() {
      return context2d;
    },
    setPointerCapture() {},
    toDataURL() {
      return "data:image/png;base64,test";
    },
  };
  const controls = {
    sizeValue: {},
    status: {},
    clearButton: {},
    downloadButton: {},
    color: {},
    size: {},
  };
  let download;
  const document = {
    getElementById(id) {
      return id === "canvas" ? canvas : controls[id];
    },
    createElement() {
      return {
        click() {
          download = this.href;
        },
      };
    },
    querySelector() {
      return {
        classList: {
          remove() {},
          add() {},
        },
      };
    },
  };
  const context = vm.createContext({ document, Math });
  vm.runInContext(editor + "\n" + brushes, context);
  canvas.onpointerdown({ offsetX: 1, offsetY: 2, pointerId: 1 });
  canvas.onpointermove({ offsetX: 5, offsetY: 6 });
  canvas.onpointerup({ offsetX: 5, offsetY: 6 });
  context.selectBrush("myBrush");
  canvas.onpointerdown({ offsetX: 10, offsetY: 11, pointerId: 1 });
  controls.clearButton.onclick();
  controls.downloadButton.onclick();
  assert.ok(calls.some((call) => call[0] === "lineTo"));
  assert.ok(calls.some((call) => call[0] === "arc"));
  assert.ok(calls.some((call) => call[0] === "clearRect"));
  assert.match(download, /^data:image\/png/);
});
