// The panel's toggle must stay under the pointer that clicked it: whatever stage
// the panel moves to, the button the user just clicked stays at the same spot.
// This drives the real GUI over CDP and measures the button centre after each click.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9391;
const PROFILE = `${process.env.TEMP}\\dsh-panel-fold`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    "--window-size=1440,900", "about:blank",
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

const { targetInfos } = await send("Target.getTargets");
const page = targetInfos.find((t) => t.type === "page");
const { sessionId } = await send("Target.attachToTarget", { targetId: page.targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Page.navigate", { url: `http://127.0.0.1:${process.argv[2] ?? "3080"}/` }, sessionId);

const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 60000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) await sleep(700);
await sleep(1500);

const stageOf = () => evaluate(`document.querySelector('[data-dsh-skin-panel]').getAttribute('data-dsh-skin-mini') !== null
    ? 2
    : document.querySelector('[data-dsh-skin-panel]').getAttribute('data-dsh-skin-folded') !== null ? 1 : 0`);
const buttonCentre = () => evaluate(`(() => {
    const b = document.querySelector('[data-dsh-skin-panel] [data-dsh-skin-fold]').getBoundingClientRect();
    const p = document.querySelector('[data-dsh-skin-panel]').getBoundingClientRect();
    return { bx: Math.round(b.x + b.width / 2), by: Math.round(b.y + b.height / 2), panel: [Math.round(p.x), Math.round(p.y)] };
})()`);
const clickAt = async (x, y) => {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
    await sleep(500);
};

const results = [];
let stage = await stageOf();
let spot = await buttonCentre();
results.push({ stage, ...spot });
console.log(`stage ${stage}: button (${spot.bx},${spot.by}) panel (${spot.panel})`);

for (let i = 0; i < 3; i++) {
    await clickAt(spot.bx, spot.by);
    stage = await stageOf();
    spot = await buttonCentre();
    results.push({ stage, ...spot });
    console.log(`stage ${stage}: button (${spot.bx},${spot.by}) panel (${spot.panel})`);
}

const first = results[0];
const worst = results.reduce((m, r) => Math.max(m, Math.abs(r.bx - first.bx), Math.abs(r.by - first.by)), 0);
console.log(`按钮相对点击点的最大偏移: ${worst}px`);
console.log(worst <= 2 ? "ok — 开关在缩放时保持原位" : "FAIL — 开关随缩放偏移");

ws.close();
chrome.kill();
