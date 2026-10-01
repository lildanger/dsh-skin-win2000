// Stop probing injected markup and measure what the application actually renders:
// find every element on a real page whose computed font-weight is >= 500, report the
// engine-resolved font for each, and check whether pixel mode is even active.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9372;
const PROFILE = `${process.env.TEMP}\\dsh-real-bold`;
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
await send("DOM.enable", {}, sessionId);
await send("CSS.enable", {}, sessionId);
const WEB_PORT = process.argv[2] ?? "3081";
await send("Page.navigate", { url: `http://127.0.0.1:${WEB_PORT}/` }, sessionId);

const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 45000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) await sleep(700);
await sleep(3000);

const env = await evaluate(`(() => ({
    skin: document.body.getAttribute('data-dsh-skin'),
    pixel: document.body.hasAttribute('data-dsh-skin-pixel'),
    skinStyleSheets: [...document.querySelectorAll('style[data-dsh-skin]')].length,
}))()`);
console.log("环境：skin=" + env.skin + "  像素模式=" + env.pixel + "  皮肤样式表=" + env.skinStyleSheets + "\n");

const bolds = await evaluate(`(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const w = parseInt(cs.fontWeight, 10);
        if (!(w >= 500)) continue;
        const txt = el.textContent.trim();
        if (!txt || txt.length > 40) continue;
        // Leaf-ish only, to keep the list readable.
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40), weight: cs.fontWeight, family: cs.fontFamily.slice(0, 40), text: txt.slice(0, 24) });
        if (out.length >= 10) break;
    }
    return out;
})()`);

console.log("页面上 computed font-weight >= 500 的真实元素（最多 10 个）：");
if (bolds.length === 0) console.log("  （一个都没有 —— 全站文字都在 500 以下）");
for (const b of bolds) {
    console.log("  " + b.tag.padEnd(7) + "weight=" + b.weight.padEnd(5) + "family=" + b.family.padEnd(28) + JSON.stringify(b.text) + "  cls=" + b.cls);
}

ws.close();
chrome.kill();
