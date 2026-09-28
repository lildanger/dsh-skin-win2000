// Ask the running page what that strip of elements is: list everything hugging
// the right edge, with its class names and the borders it currently carries.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9344;
const PROFILE = `${process.env.TEMP}\\dsh-inspect-profile`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    "--window-size=1511,900", "about:blank",
], { stdio: "ignore" });

const endpoint = async () => {
    for (let i = 0; i < 60; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
            const json = await res.json();
            if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
        } catch { /* not up */ }
        await sleep(500);
    }
    throw new Error("no devtools endpoint");
};

const ws = new WebSocket(await endpoint(), { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });

let nextId = 1;
const pending = new Map();
ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id !== undefined && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
    }
});
const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

const { targetInfos } = await send("Target.getTargets");
const page = targetInfos.find((t) => t.type === "page");
const { sessionId } = await send("Target.attachToTarget", { targetId: page.targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: 1511, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await send("Page.navigate", { url: "http://127.0.0.1:3080/" }, sessionId);

const waitFor = async (expression, timeoutMs, label) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const { result } = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
        if (result?.value) return result.value;
        await sleep(500);
    }
    throw new Error("timeout: " + label);
};
await waitFor("!!document.querySelector('[data-dsh-skin-panel]')", 40000, "panel");
await sleep(3500);

const probe = `(() => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right < vw - 80) continue;
    if (r.width > 90 || r.height > 420) continue;
    const cs = getComputedStyle(el);
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className).slice(0, 70),
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
      shadow: cs.boxShadow.slice(0, 60),
      bg: cs.backgroundColor,
      role: el.getAttribute('role'),
      aria: el.getAttribute('aria-label'),
      text: (el.textContent || '').trim().slice(0, 18),
    });
  }
  return { vw, vh, items: out };
})()`;

const { result } = await send("Runtime.evaluate", { expression: probe, returnByValue: true }, sessionId);
const data = result.value;
console.log(`viewport ${data.vw}x${data.vh}, ${data.items.length} elements hug the right edge\n`);
for (const it of data.items) {
    console.log(`${it.tag}  [${it.rect.join(",")}]  role=${it.role ?? "-"} aria=${it.aria ?? "-"}`);
    console.log(`    class: ${it.cls || "(none)"}`);
    console.log(`    border: ${it.border}   shadow: ${it.shadow || "none"}   bg: ${it.bg}`);
    if (it.text) console.log(`    text: ${JSON.stringify(it.text)}`);
}

ws.close();
chrome.kill();
