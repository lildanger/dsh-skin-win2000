// The previous capture was clipped against viewport coordinates while Page.captureScreenshot
// expects page coordinates, so with the settings page scrolled the region landed in the
// wrong place — labels cut in half, empty rows in the middle.
//
// Fix: scroll to the top first and offset the clip by the scroll position, shorten the
// labels, and widen the capture so nothing is cropped.
import { spawn } from "node:child_process";
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9386;
const PROFILE = `${process.env.TEMP}\\dsh-toggle-menu2`;
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

const box = await evaluate(`(() => {
    const values = [8, 10, 12, 14, 16];
    const source = [...document.querySelectorAll('[class*="_switch"]')].find((s) => s.getAttribute('aria-checked') === 'true')
                 || document.querySelector('[class*="_switch"]');
    if (!source) return null;

    // Pin the panel to the document origin so page and viewport coordinates agree.
    window.scrollTo(0, 0);
    const panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;left:24px;top:24px;z-index:99999;background:#D4D0C8;padding:14px 18px;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080;font:12px monospace;color:#000';

    for (const v of values) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:16px;margin:8px 0';
        const label = document.createElement('span');
        label.textContent = v + 'px';
        label.style.cssText = 'width:44px;text-align:right';
        const clone = source.cloneNode(true);
        clone.firstElementChild.style.setProperty('transform', 'translateX(' + v + 'px)', 'important');
        row.appendChild(label);
        row.appendChild(clone);
        panel.appendChild(row);
    }
    document.body.appendChild(panel);
    const r = panel.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
})()`);

if (!box) { console.log("没找到开关"); ws.close(); chrome.kill(); process.exit(1); }
await sleep(600);

const { data } = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.w + 16, height: box.h + 16, scale: 5 },
}, sessionId);
mkdirSync("workspace", { recursive: true });
writeFileSync("workspace/toggle-travel-options.png", Buffer.from(data, "base64"));
console.log("已重写 workspace/toggle-travel-options.png   面板 " + Math.round(box.w) + "x" + Math.round(box.h) + "  从上到下 8/10/12/14/16px");

ws.close();
chrome.kill();
