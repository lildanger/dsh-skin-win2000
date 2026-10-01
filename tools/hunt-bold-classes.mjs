// The suppression selector includes [class*="bold"], which could catch the application's
// own bold utilities (Tailwind's font-bold, for instance) and flatten a 600 the app
// intends. Look for any element carrying such a class and see what weight it resolves to.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9378;
const PROFILE = `${process.env.TEMP}\\dsh-bold-class-hunt`;
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
await sleep(3000);

// Visit the panels most likely to hold bold-classed elements.
for (const label of ["设置", "字体", "内置插件"]) {
    await evaluate(`(() => {
        const el = [...document.querySelectorAll('button,a,[role="button"]')].find((n) => n.textContent.trim() === ${JSON.stringify(label)});
        if (el) el.click();
    })()`);
    await sleep(2000);
}

const out = await evaluate(`(() => {
    const seen = new Map();
    let matched = 0;
    for (const el of document.querySelectorAll('[class*="bold"],[class*="Bold"]')) {
        matched++;
        const cs = getComputedStyle(el);
        const cls = String(el.className);
        const boldClass = (cls.match(/[A-Za-z0-9_-]*[Bb]old[A-Za-z0-9_-]*/g) || []).join(" ");
        const key = boldClass + " => " + cs.fontWeight;
        if (!seen.has(key)) {
            seen.set(key, { cls: boldClass, weight: cs.fontWeight, skinRule: el.matches(':is(b,strong,[class*="bold"],[class*="Bold"])'), sample: el.textContent.trim().slice(0, 16) });
        }
    }
    return { matched, rows: [...seen.values()].slice(0, 12) };
})()`);

console.log("页面上带 bold 类名的元素：" + out.matched + " 个\n");
if (out.rows.length === 0) console.log("  （一个都没有 —— 压制选择器不会误伤应用的粗体）");
for (const r of out.rows) {
    console.log("  class=" + r.cls.padEnd(22) + "weight=" + r.weight.padEnd(6) + "被皮肤压制规则命中=" + r.skinRule + "  " + JSON.stringify(r.sample));
}

ws.close();
chrome.kill();
