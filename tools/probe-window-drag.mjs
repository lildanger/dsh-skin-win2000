// End-to-end check for the window specimen drag: open the panel's 窗口示例 row, drag
// the title bar with real CDP mouse input (which the engine turns into pointer events),
// then read where the window landed and what it remembered.
//
// Own headless profile; the user's browser is not touched.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9390;
const PROFILE = `${process.env.TEMP}\\dsh-window-drag`;
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
const WEB_PORT = process.argv[2] ?? "3080";
await send("Page.navigate", { url: `http://127.0.0.1:${WEB_PORT}/` }, sessionId);

const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 60000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) await sleep(700);
if (!(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) {
    console.log("皮肤面板没有挂载，放弃");
    ws.close();
    chrome.kill();
    process.exit(1);
}
await sleep(2000);

// Open the specimen from the panel row.
const opened = await evaluate(`(() => {
    const row = [...document.querySelectorAll('[data-dsh-skin-panel] > button')]
        .find((b) => b.textContent.trim().endsWith('窗口示例'));
    if (!row) return 'no row';
    row.click();
    return 'clicked';
})()`);
await sleep(1200);
const before = await evaluate(`(() => {
    const el = document.querySelector('[data-dsh-skin-window]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, styleLeft: el.style.left, styleTop: el.style.top };
})()`);
console.log("打开窗口示例: " + opened);
if (!before) {
    console.log("窗口没有出现");
    ws.close();
    chrome.kill();
    process.exit(1);
}
console.log("拖动前: " + JSON.stringify(before));

const barBox = await evaluate(`(() => {
    const r = document.querySelector('[data-dsh-skin-window] [data-dsh-skin-titlebar]').getBoundingClientRect();
    return { x: r.x + Math.round(r.width / 2), y: r.y + Math.round(r.height / 2) };
})()`);

const dragTo = { x: barBox.x + 180, y: barBox.y + 320 };
const mouse = (type, x, y, buttons) => send("Input.dispatchMouseEvent", {
    type, x, y, button: "left", buttons, clickCount: type === "mouseMoved" ? 0 : 1,
}, sessionId);

await mouse("mousePressed", barBox.x, barBox.y, 1);
for (let step = 1; step <= 4; step++) {
    await mouse("mouseMoved", barBox.x + ((dragTo.x - barBox.x) * step) / 4, barBox.y + ((dragTo.y - barBox.y) * step) / 4, 1);
    await sleep(120);
}
await mouse("mouseReleased", dragTo.x, dragTo.y, 0);
await sleep(600);

const after = await evaluate(`(() => {
    const el = document.querySelector('[data-dsh-skin-window]');
    const r = el.getBoundingClientRect();
    return {
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        styleLeft: el.style.left,
        styleTop: el.style.top,
        styleTransform: el.style.transform,
        stored: localStorage.getItem('dsh.skin.win2000.window'),
    };
})()`);
console.log("拖动后: " + JSON.stringify(after));
const movedBy = { dx: Math.round(after.rect.x - before.x), dy: Math.round(after.rect.y - before.y) };
console.log("实际位移: dx=" + movedBy.dx + " dy=" + movedBy.dy + "  (拖拽请求 dx=180 dy=320)");

mkdirSync("workspace", { recursive: true });
const { data } = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: Math.max(0, after.rect.x - 8), y: Math.max(0, after.rect.y - 8), width: after.rect.w + 16, height: after.rect.h + 16, scale: 2 },
}, sessionId);
writeFileSync("workspace/window-dragged.png", Buffer.from(data, "base64"));
console.log("截图: workspace/window-dragged.png");

// Reload and reopen the specimen: the remembered position must come back.
await send("Page.reload", {}, sessionId);
const again = Date.now() + 45000;
while (Date.now() < again && !(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) await sleep(700);
await sleep(2000);
await evaluate(`(() => {
    const row = [...document.querySelectorAll('[data-dsh-skin-panel] > button')]
        .find((b) => b.textContent.trim().endsWith('窗口示例'));
    if (row) row.click();
})()`);
await sleep(1200);
const restored = await evaluate(`(() => {
    const el = document.querySelector('[data-dsh-skin-window]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), styleLeft: el.style.left, styleTop: el.style.top };
})()`);
console.log("刷新后重新打开: " + JSON.stringify(restored));

// Double click the title bar: Windows 2000 maximises, and restoring must come back
// to the same spot rather than shifting.
const barNow = await evaluate(`(() => {
    const r = document.querySelector('[data-dsh-skin-window] [data-dsh-skin-titlebar]').getBoundingClientRect();
    return { x: r.x + Math.round(r.width / 2), y: r.y + Math.round(r.height / 2) };
})()`);
const doubleClick = async (x, y) => {
    await mouse("mousePressed", x, y, 1);
    await mouse("mouseReleased", x, y, 0);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 2 }, sessionId);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 2 }, sessionId);
};
await doubleClick(barNow.x, barNow.y);
await sleep(800);
const maximized = await evaluate(`(() => {
    const el = document.querySelector('[data-dsh-skin-window]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
             styleLeft: el.style.left, styleWidth: el.style.width, viewport: innerWidth + 'x' + innerHeight };
})()`);
console.log("双击最大化: " + JSON.stringify(maximized));
const full = await send("Page.captureScreenshot", { format: "png" }, sessionId);
writeFileSync("workspace/window-maximized.png", Buffer.from(full.data, "base64"));
console.log("截图: workspace/window-maximized.png");

const barMax = await evaluate(`(() => {
    const r = document.querySelector('[data-dsh-skin-window] [data-dsh-skin-titlebar]').getBoundingClientRect();
    return { x: r.x + Math.round(r.width / 2), y: r.y + Math.round(r.height / 2) };
})()`);
await doubleClick(barMax.x, barMax.y);
await sleep(800);
const restoredAgain = await evaluate(`(() => {
    const el = document.querySelector('[data-dsh-skin-window]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), styleLeft: el.style.left, styleWidth: el.style.width };
})()`);
console.log("再次双击还原: " + JSON.stringify(restoredAgain));

ws.close();
chrome.kill();
