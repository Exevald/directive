export const mockProvider = {
  async generatePlan({ canvas, tools }) {
    const delay = Number(process.env.MOCK_DELAY_MS || 0);
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, Math.min(delay, 5000)));
    const actions = [];
    const add = (tool, args) => { if (tools.includes(tool)) actions.push({ tool, args }); };
    const x = canvas.width / 2, y = canvas.height / 2;
    add("setColor", { color: "#2e7d32" });
    add("setSize", { size: 8 });
    add("drawRectangle", { x: x - 80, y: y - 40, width: 160, height: 110 });
    add("drawLine", { x1: x - 90, y1: y - 40, x2: x, y2: y - 120 });
    add("drawLine", { x1: x, y1: y - 120, x2: x + 90, y2: y - 40 });
    add("myBrush", { x1: x, y1: y + 80, x2: x + 60, y2: y + 80 });
    if (!actions.length) add("fillCircle", { x, y, radius: 30 });
    if (!actions.length) add("drawCircle", { x, y, radius: 30 });
    if (!actions.length) add("myBrush", { x1: x, y1: y, x2: x + 30, y2: y + 30 });
    return { actions };
  }
};
