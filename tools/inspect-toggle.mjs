// Locate the toggle switches on the Settings page and describe the parts that make
// them look round: the track, the thumb, and any radius either of them carries.
//
// Own headless profile; the user's browser is not touched.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9362;
const PROFILE = `${process.env.TEMP}\\dsh-toggle-probe`;
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
const PORT_WEB = process.argv[2] ?? "3081";
await send("Page.navigate", { url: `http://127.0.0.1:${PORT_WEB}/` }, sessionId);

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

const report = await evaluate(`(() => {
    const out = [];
    // Switches expose role=switch, or are buttons carrying aria-checked.
    const found = [...document.querySelectorAll('[role="switch"],[aria-checked],input[type="checkbox"]')];
    for (const el of found.slice(0, 6)) {
        const cs = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        // Its subtree: the track is usually the element itself, the thumb a child.
        const kids = [...el.querySelectorAll('*')].map((c) => {
            const k = getComputedStyle(c);
            const kb = c.getBoundingClientRect();
            return {
                tag: c.tagName.toLowerCase(),
                cls: String(c.className).slice(0, 46),
                w: Math.round(kb.width), h: Math.round(kb.height),
                radius: k.borderRadius,
                bg: k.backgroundColor,
                shadow: k.boxShadow.slice(0, 70),
            };
        });
        out.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 70),
            role: el.getAttribute('role'),
            checked: el.getAttribute('aria-checked'),
            size: Math.round(box.width) + 'x' + Math.round(box.height),
            radius: cs.borderRadius,
            bg: cs.backgroundColor,
            label: el.textContent.trim().slice(0, 20),
            kids,
        });
    }
    return out;
})()`);

console.log("设置页上的开关数量: " + report.length + "\n");
for (const s of report) {
    console.log("-- " + s.tag + "  " + s.size + "  class=" + (s.cls || "(none)"));
    console.log("   role=" + s.role + " aria-checked=" + s.checked + "  文本=" + JSON.stringify(s.label));
    console.log("   自身: radius=" + s.radius + "  bg=" + s.bg);
    for (const k of s.kids) {
        console.log("     子 " + k.tag + " " + k.w + "x" + k.h + " radius=" + k.radius + " bg=" + k.bg);
        if (k.shadow) console.log("        shadow=" + k.shadow);
    }
}

ws.close();
chrome.kill();
