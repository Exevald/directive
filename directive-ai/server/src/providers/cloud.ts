export function cloudProvider(config) {
  return {
    async generatePlan(input, signal) {
      const instructions = `Draw on ${input.canvas.width}x${input.canvas.height} using only these tools: ${input.tools.join(", ")}. Return JSON {"actions":[{"tool":"...","args":{...}}]}. Exact named arguments: setColor(color #RRGGBB); setSize(size 1-80); drawLine(x1,y1,x2,y2); drawCircle(x,y,radius); fillCircle(x,y,radius); drawRectangle(x,y,width,height) is outline only; myBrush(x1,y1,x2,y2) is an unknown student brush. Use large shapes then details. 1-80 actions. No prose.`;
      const response = await fetch(config.baseUrl + "/chat/completions", {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: instructions }, { role: "user", content: input.prompt }], response_format: { type: "json_object" } })
      });
      if (!response.ok) throw Error("Provider unavailable");
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.length > 65536) throw Error("Invalid provider response");
      return JSON.parse(content);
    }
  };
}
