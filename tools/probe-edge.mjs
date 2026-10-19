// How far right can the two floating things actually go? Drags the specimen window
// and the skin panel to the far right edge and reports where they land.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9393;
const PROFILE = `${process.env.TEMP}\\dsh-edge`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--window-size=1440,900", "about:blank"], { stdio: "ignore" });
const endpoint = async () => {
    for (let i = 0; i < 60; i++) {
        try {
            const json = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
            if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
        } catch { /* not up */ }
        await sleep(500);
    }
    throw new Error("no endpoint");
};
const ws = new WebSocket(await endpoint(), { perMessageDeflate: false });
await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });
let nextId = 1;
const pending = new Map();
ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id !== undefined && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const { targetInfos } = await send("Target.getTargets");
const { sessionId } = await send("Target.attachToTarget", { targetId: targetInfos.find((t) => t.type === "page").targetId, flatten: true });
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

const mouse = (type, x, y, buttons) =>
    send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons, clickCount: 1 }, sessionId);
const drag = async (from, to) => {
    await mouse("mousePressed", from.x, from.y, 1);
    for (let i = 1; i <= 12; i++) {
        await send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: Math.round(from.x + ((to.x - from.x) * i) / 12),
            y: Math.round(from.y + ((to.y - from.y) * i) / 12),
            button: "left", buttons: 1,
        }, sessionId);
        await sleep(20);
    }
    await mouse("mouseReleased", to.x, to.y, 0);
    await sleep(400);
};
const viewport = await evaluate("({ w: innerWidth, h: innerHeight })");
console.log("视口: " + JSON.stringify(viewport));

// 1. skin panel: drag its title bar to the far right.
const panelBar = await evaluate(`(() => {
    const r = document.querySelector('[data-dsh-skin-panelbar]').getBoundingClientRect();
    const p = document.querySelector('[data-dsh-skin-panel]').getBoundingClientRect();
    return { x: Math.round(r.x + 20), y: Math.round(r.y + r.height / 2), panel: [Math.round(p.x), Math.round(p.y), Math.round(p.width)] };
})()`);
console.log("面板起点: " + JSON.stringify(panelBar));
await drag({ x: panelBar.x, y: panelBar.y }, { x: viewport.w - 2, y: 300 });
const panelAfter = await evaluate(`(() => {
    const p = document.querySelector('[data-dsh-skin-panel]').getBoundingClientRect();
    return { x: Math.round(p.x), right: Math.round(p.right), w: Math.round(p.width), ui: localStorage.getItem('dsh.skin.win2000.ui') };
})()`);
console.log("面板拖到最右: " + JSON.stringify(panelAfter) + `  (右边缘差 ${viewport.w - panelAfter.right}px)`);

// 2. specimen window: open it from the panel, then drag its title bar right.
await evaluate(`(() => {
    const rows = [...document.querySelectorAll('[data-dsh-skin-panel] button, [data-dsh-skin-panel] [role="button"]')];
    const row = rows.find((r) => (r.textContent || '').includes('窗口示例'));
    if (row) row.click();
    return !!row;
})()`);
await sleep(700);
const winBar = await evaluate(`(() => {
    const w = document.querySelector('[data-dsh-skin-window]');
    if (!w) return null;
    const r = w.getBoundingClientRect();
    const b = w.querySelector('[data-dsh-skin-titlebar]').getBoundingClientRect();
    return { x: Math.round(b.x + 60), y: Math.round(b.y + b.height / 2), win: [Math.round(r.x), Math.round(r.y), Math.round(r.width)] };
})()`);
console.log("窗口起点: " + JSON.stringify(winBar));
if (winBar) {
    await drag({ x: winBar.x, y: winBar.y }, { x: viewport.w - 2, y: winBar.y });
    const winAfter = await evaluate(`(() => {
        const w = document.querySelector('[data-dsh-skin-window]');
        const r = w.getBoundingClientRect();
        return { x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width), stored: localStorage.getItem('dsh.skin.win2000.window') };
    })()`);
    console.log("窗口拖到最右: " + JSON.stringify(winAfter) + `  (右边缘差 ${viewport.w - winAfter.right}px)`);
}

ws.close();
chrome.kill();
