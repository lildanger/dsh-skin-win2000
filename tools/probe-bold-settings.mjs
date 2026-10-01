// Same scan, but on the Settings page, where headings and group titles are actually
// bold. Reports computed weight, the resolved font, and — when something is NOT bold
// that declares a bold weight — the matching rules, so the culprit is visible.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9374;
const PROFILE = `${process.env.TEMP}\\dsh-bold-settings`;
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
await sleep(2500);

await evaluate(`(() => {
    const el = [...document.querySelectorAll('button,a,[role="button"]')].find((n) => n.textContent.trim() === '设置');
    if (el) el.click();
})()`);
await sleep(3500);

const bolds = await evaluate(`(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const w = parseInt(cs.fontWeight, 10);
        if (!(w >= 500)) continue;
        const txt = el.textContent.trim();
        if (!txt || txt.length > 30) continue;
        const leaves = [...el.children].filter((c) => c.textContent.trim()).length;
        if (leaves > 2) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        out.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 36),
            weight: cs.fontWeight,
            family: cs.fontFamily.slice(0, 34),
            text: txt.slice(0, 20),
        });
        if (out.length >= 14) break;
    }
    return out;
})()`);

console.log("设置页上 computed font-weight >= 500 的真实元素：\n");
if (bolds.length === 0) console.log("  （没有）");
for (const b of bolds) {
    console.log("  " + b.tag.padEnd(7) + "weight=" + b.weight.padEnd(5) + "family=" + b.family.padEnd(26) + JSON.stringify(b.text));
}

// Which skin rules mention font-weight at all?
const rules = await evaluate(`(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
        let list;
        try { list = sheet.cssRules; } catch { continue; }
        for (const r of list) {
            if (r.cssText && r.cssText.includes('font-weight')) out.push(r.cssText.slice(0, 150));
        }
    }
    return out;
})()`);
console.log("\n样式表里所有涉及 font-weight 的规则（" + rules.length + " 条）：");
for (const r of rules.slice(0, 12)) console.log("  " + r);

ws.close();
chrome.kill();
