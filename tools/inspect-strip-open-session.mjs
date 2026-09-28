// Open a session that has content, then report every element hugging the right
// edge — the quick-jump marker strip only renders once there are turns to mark.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9346;
const PROFILE = `${process.env.TEMP}\\dsh-inspect3-profile`;
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
            const json = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
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
const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
    return result?.value;
};

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
        const value = await evaluate(expression);
        if (value) return value;
        await sleep(500);
    }
    throw new Error("timeout: " + label);
};
await waitFor("!!document.querySelector('[data-dsh-skin-panel]')", 40000, "panel");
await sleep(2500);

// Click the first session row in the sidebar.
const clicked = await evaluate(`(() => {
  const rows = [...document.querySelectorAll('button,a,[role="button"],[role="option"],li')]
    .filter((el) => /Windows 2003|皮肤/.test(el.textContent || '') && el.getBoundingClientRect().left < 260);
  const row = rows[rows.length - 1];
  if (!row) return 'no session row';
  row.click();
  return 'clicked: ' + (row.textContent || '').trim().slice(0, 24);
})()`);
console.log(clicked);

// Wait until the transcript actually has turns.
const turns = await waitFor(
    `document.querySelectorAll('[data-turn], article, [class*="turn"]').length > 2 ? document.querySelectorAll('[data-turn], article, [class*="turn"]').length : 0`,
    40000,
    "transcript turns",
);
console.log("transcript elements: " + turns);
await sleep(3000);

// Scroll the transcript so the strip has to render its markers.
await evaluate(`(() => {
  const scrollers = [...document.querySelectorAll('*')].filter((el) => el.scrollHeight > el.clientHeight + 300 && el.clientHeight > 300);
  const main = scrollers.sort((a, b) => b.clientHeight - a.clientHeight)[0];
  if (main) { main.scrollTop = Math.floor(main.scrollHeight * 0.35); return 1; }
  return 0;
})()`);
await sleep(2500);

const items = await evaluate(`(() => {
  const vw = window.innerWidth;
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.left < vw - 150) continue;
    const cs = getComputedStyle(el);
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className).slice(0, 58),
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      pos: cs.position,
      border: cs.borderTopWidth + '/' + cs.borderTopStyle + '/' + cs.borderTopColor,
      radius: cs.borderRadius,
      bg: cs.backgroundColor,
      kids: el.children.length,
      html: el.outerHTML.slice(0, 90),
    });
  }
  out.sort((a, b) => a.rect[0] - b.rect[0] || a.rect[1] - b.rect[1]);
  return out;
})()`);

console.log(`\n${items.length} elements in the right 150px\n`);
for (const it of items) {
    console.log(`${it.tag.padEnd(6)} [${it.rect.join(",")}] pos=${it.pos} kids=${it.kids} border=${it.border} radius=${it.radius} bg=${it.bg}`);
    console.log(`       class: ${it.cls || "(none)"}`);
    console.log(`       html:  ${it.html.replace(/\s+/g, " ")}`);
}

ws.close();
chrome.kill();
