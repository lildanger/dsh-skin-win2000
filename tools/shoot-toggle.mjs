// Capture the switch area, magnified, so the thumb position can be judged by eye
// instead of argued about. Both states are captured side by side: the first switch is
// screenshotted as-is, then after clicking it.
import { spawn } from "node:child_process";
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9382;
const PROFILE = `${process.env.TEMP}\\dsh-toggle-shot`;
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

const shot = async (label) => {
    const box = await evaluate(`(() => {
        // Find a switch that is ON, so the "on" geometry is what gets judged.
        const all = [...document.querySelectorAll('[class*="_switch"]')];
        const el = all.find((s) => s.getAttribute('aria-checked') === 'true') || all[0];
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height, checked: el.getAttribute('aria-checked') };
    })()`);
    if (!box) { console.log(label + ": 没找到开关"); return; }
    const pad = 14;
    const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + pad * 2, height: box.h + pad * 2, scale: 8 },
    }, sessionId);
    mkdirSync("workspace", { recursive: true });
    const path = "workspace/toggle-" + label + ".png";
    writeFileSync(path, Buffer.from(data, "base64"));
    console.log(label + ": aria-checked=" + box.checked + "  轨道 " + box.w + "x" + box.h + "  -> " + path);
};

await shot("on");
await evaluate(`(() => {
    const all = [...document.querySelectorAll('[class*="_switch"]')];
    const el = all.find((s) => s.getAttribute('aria-checked') === 'true') || all[0];
    if (el) el.click();
})()`);
await sleep(900);
await shot("off");

ws.close();
chrome.kill();
