(function () {
  "use strict";
  if (window.__directiveArtistV1) return;
  window.__directiveArtistV1 = true;

  function initialize() {
    const script =
      document.currentScript || document.querySelector('script[src*="/artist/v1/artist.js"]');
    const endpoint = script?.dataset.gateway || (script ? new URL(script.src).origin : "");
    const canvas = document.getElementById("canvas");
    const names = [
      "setColor",
      "setSize",
      "drawLine",
      "drawCircle",
      "fillCircle",
      "drawRectangle",
      "myBrush",
    ];
    const available = names.filter((name) => typeof window[name] === "function");
    const panel = document.createElement("section");
    panel.id = "directive-artist-v1";
    const shadow = panel.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host{display:block;margin:18px auto;max-width:1180px;font:14px system-ui,sans-serif;color:#172026}
      .box{padding:18px;border:1px solid #d9e0e6;border-radius:10px;background:white}
      h2{margin:0 0 12px;font-size:18px} form{display:flex;gap:8px;flex-wrap:wrap} input{flex:1;min-width:200px;padding:9px;border:1px solid #bbc6cc;border-radius:6px}
      button{padding:9px 14px;border:1px solid #0f766e;border-radius:6px;background:#0f766e;color:white;cursor:pointer}button.secondary{background:white;color:#0f766e}button:disabled{opacity:.5;cursor:default}
      p{margin:10px 0 0;color:#55636e}
    </style><div class="box"><h2>ИИ-художник</h2><form><input name="prompt" maxlength="500" placeholder="Что нарисовать?" required><button type="submit">Нарисовать с ИИ</button><button class="secondary" type="button" id="cancel" disabled>Отмена</button></form><p id="status" role="status"></p></div>`;
    (canvas?.parentElement || document.body).insertAdjacentElement("afterend", panel);
    const form = shadow.querySelector("form"),
      prompt = shadow.querySelector("input"),
      submit = shadow.querySelector('button[type="submit"]'),
      cancel = shadow.querySelector("#cancel"),
      status = shadow.querySelector("#status");
    const say = (message) => {
      status.textContent = message;
    };
    let controller = null,
      stopped = false,
      running = false;
    if (!canvas || !available.some((name) => !["setColor", "setSize"].includes(name))) {
      submit.disabled = true;
      say("Нет холста или функций рисования.");
      return;
    }
    say("Готов к рисованию. Доступных инструментов: " + available.length);
    cancel.onclick = () => {
      stopped = true;
      controller?.abort();
      say("Остановлено.");
    };
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (running) return;
      running = true;
      stopped = false;
      controller = new AbortController();
      submit.disabled = true;
      cancel.disabled = false;
      try {
        let token = "";
        const code = window.prompt("Код мероприятия");
        if (!code) throw Error("Нужен код мероприятия");
        token = await session(code);
        say("Модель готовит рисунок…");
        const response = await fetch(endpoint + "/v1/draw", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({
            schemaVersion: 1,
            prompt: prompt.value,
            canvas: { width: canvas.width, height: canvas.height },
            tools: available,
          }),
        });
        const plan = await response.json();
        if (!response.ok) throw Error(plan.error?.message || "Ошибка шлюза");
        validate(plan, canvas, available);
        if (plan.mode === "demo") say("Демо-режим: рисую командами редактора…");
        for (let index = 0; index < plan.actions.length; index++) {
          if (stopped) break;
          const item = plan.actions[index];
          say(
            (plan.mode === "demo" ? "Демо · " : "") +
              "Инструмент: " +
              item.tool +
              " · " +
              (index + 1) +
              "/" +
              plan.actions.length,
          );
          try {
            execute(item);
          } catch (error) {
            throw new Error("Ошибка инструмента " + item.tool + ": " + error.message, {
              cause: error,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        if (!stopped) say((plan.mode === "demo" ? "Демо-режим · " : "") + "Готово.");
      } catch (error) {
        if (!stopped)
          say(error.name === "AbortError" ? "Остановлено." : error.message || "Ошибка соединения");
      } finally {
        running = false;
        controller = null;
        submit.disabled = false;
        cancel.disabled = true;
      }
    };

    async function session(code) {
      const response = await fetch(endpoint + "/v1/session", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message || "Не удалось подключиться");
      return data.token;
    }

    function execute(item) {
      const a = item.args;
      const registry = {
        setColor: () => window.setColor(a.color),
        setSize: () => window.setSize(a.size),
        drawLine: () => window.drawLine(a.x1, a.y1, a.x2, a.y2),
        drawCircle: () => window.drawCircle(a.x, a.y, a.radius),
        fillCircle: () => window.fillCircle(a.x, a.y, a.radius),
        drawRectangle: () => window.drawRectangle(a.x, a.y, a.width, a.height),
        myBrush: () => window.myBrush(a.x1, a.y1, a.x2, a.y2),
      };
      if (!Object.hasOwn(registry, item.tool)) throw Error("Инструмент недоступен");
      registry[item.tool]();
      if (item.tool === "setColor") {
        const input = document.getElementById("color");
        if (input) input.value = a.color;
      }
      if (item.tool === "setSize") {
        const input = document.getElementById("size");
        if (input) input.value = a.size;
      }
    }
  }

  function validate(plan, canvas, available) {
    if (
      !plan ||
      plan.schemaVersion !== 1 ||
      !Array.isArray(plan.actions) ||
      !plan.actions.length ||
      plan.actions.length > 80
    )
      throw Error("Несовместимый протокол рисунка");
    const specs = {
      setColor: ["color"],
      setSize: ["size"],
      drawLine: ["x1", "y1", "x2", "y2"],
      drawCircle: ["x", "y", "radius"],
      fillCircle: ["x", "y", "radius"],
      drawRectangle: ["x", "y", "width", "height"],
      myBrush: ["x1", "y1", "x2", "y2"],
    };
    for (const item of plan.actions) {
      if (
        !item ||
        Object.keys(item).length !== 2 ||
        !Object.hasOwn(specs, item.tool) ||
        !available.includes(item.tool) ||
        !item.args ||
        Object.keys(item.args).length !== specs[item.tool].length ||
        !specs[item.tool].every((key) => Object.hasOwn(item.args, key))
      )
        throw Error("Недопустимая команда");
      for (const [key, value] of Object.entries(item.args)) {
        if (key === "color") {
          if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value))
            throw Error("Неверный цвет");
          continue;
        }
        if (typeof value !== "number" || !Number.isFinite(value)) throw Error("Неверный аргумент");
        if (key === "size" && (value < 1 || value > 80)) throw Error("Неверный размер");
        if (key === "radius" && (value < 0 || value > Math.max(canvas.width, canvas.height)))
          throw Error("Неверный радиус");
        if (key !== "size" && key !== "radius") {
          const limit = ["x", "x1", "x2", "width"].includes(key) ? canvas.width : canvas.height;
          if (value < -limit || value > limit * 2) throw Error("Координата вне диапазона");
        }
      }
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
