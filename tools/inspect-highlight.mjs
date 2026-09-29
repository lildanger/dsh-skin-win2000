// Open the slash-command menu in a real browser and read what paints the selected
// row: its DOM identity, its computed colour, and whether the skin's selectors
// match it at all.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9350;
const PROFILE = `${process.env.TEMP}\\dsh-highlight-profile`;
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
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await send("Page.navigate", { url: "http://127.0.0.1:3080/" }, sessionId);

const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 45000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) await sleep(700);
await sleep(2500);

// Focus the composer and type a slash to open the command menu.
const focused = await evaluate(`(() => {
    const el = document.querySelector('[data-composer-input] [contenteditable="true"], [contenteditable="true"], textarea');
    if (!el) return 'no composer';
    el.focus();
    return el.tagName + '.' + String(el.className).slice(0, 40);
})()`);
console.log("composer: " + focused);
await send("Input.insertText", { text: "/" }, sessionId);
await sleep(2500);

const report = await evaluate(`(() => {
    const out = { menuFound: false, rows: [] };
    // Anything that looks like a popup with options.
    const candidates = [...document.querySelectorAll('[role="listbox"],[role="menu"],[role="option"],[role="menuitem"],[class*="menu"],[class*="Menu"],[class*="command"],[class*="Command"]')];
    out.candidateCount = candidates.length;
    // Find rows carrying a selected marker.
    const selected = [...document.querySelectorAll('*')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 8 || r.height > 80) return false;
        const cs = getComputedStyle(el);
        return cs.backgroundColor === 'rgb(10, 36, 106)';
    });
    out.navyRows = selected.length;
    for (const el of selected.slice(0, 6)) {
        const cs = getComputedStyle(el);
        const texts = [...el.querySelectorAll('*')].filter((c) =>
            c.tagName.toLowerCase() === 'svg' || (c.children.length === 0 && c.textContent.trim()),
        ).slice(0, 8);
        out.rows.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 70),
            aria: {
                selected: el.getAttribute('aria-selected'),
                current: el.getAttribute('aria-current'),
                role: el.getAttribute('role'),
            },
            matchesSkin: {
                selected: el.matches(':is([aria-selected="true"],[data-selected="true"],[class*="_selected"])'),
                hovered: el.matches(':hover'),
            },
            ownColor: cs.color,
            blacks: [...el.querySelectorAll('*')]
                .filter((c) => getComputedStyle(c).color === 'rgb(0, 0, 0)')
                .map((c) => c.tagName.toLowerCase() + (c.textContent.trim() ? ':' + c.textContent.trim().slice(0, 10) : '')),
            children: texts.map((c) => ({
                tag: c.tagName.toLowerCase(),
                cls: String(c.className).slice(0, 40),
                color: getComputedStyle(c).color,
                text: c.textContent.trim().slice(0, 14),
            })),
        });
    }
    return out;
})()`);

console.log("\n候选弹层元素: " + report.candidateCount);
console.log("背景为 #0A246A 的行: " + report.navyRows);
for (const row of report.rows) {
    console.log("\n-- " + row.tag + "  class=" + row.cls);
    console.log("   aria: " + JSON.stringify(row.aria));
    console.log("   匹配皮肤选择器: " + JSON.stringify(row.matchesSkin));
    console.log("   自身 color: " + row.ownColor);
    console.log("   黑色后代: " + (row.blacks.length === 0 ? "无 ✓" : row.blacks.length + " 个 -> " + row.blacks.join(", ")));
    for (const c of row.children) console.log("     " + c.tag + " [" + c.color + "] " + JSON.stringify(c.text) + "  cls=" + c.cls);
}

ws.close();
chrome.kill();
