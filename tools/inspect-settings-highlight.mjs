// Find every navy-highlighted element on the Settings page and report what is
// black inside it — the skin's backstop keys on aria-selected / data-selected /
// _selected, so a highlight that uses none of those stays unreadable.
//
// Own headless profile; the user's browser is not touched.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9360;
const PROFILE = `${process.env.TEMP}\\dsh-settings-highlight`;
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
await send("Page.navigate", { url: "http://127.0.0.1:3080/" }, sessionId);

const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 45000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) await sleep(700);
await sleep(2500);

// Open Settings from the sidebar.
const opened = await evaluate(`(() => {
    const el = [...document.querySelectorAll('button,a,[role="button"]')]
        .find((n) => n.textContent.trim() === '设置');
    if (!el) return 'settings entry not found';
    el.click();
    return 'clicked';
})()`);
console.log("打开设置: " + opened);
await sleep(3500);

const report = await evaluate(`(() => {
    const navy = 'rgb(10, 36, 106)';
    const out = { scanned: 0, navyCount: 0, rows: [] };
    for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 16 || r.width > 1400) continue;
        out.scanned++;
        const cs = getComputedStyle(el);
        if (cs.backgroundColor !== navy) continue;
        out.navyCount++;
        const blacks = [...el.querySelectorAll('*')]
            .filter((c) => getComputedStyle(c).color === 'rgb(0, 0, 0)')
            .map((c) => c.tagName.toLowerCase() + (c.textContent.trim() ? ':' + c.textContent.trim().slice(0, 16) : ''));
        out.rows.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 80),
            attrs: {
                role: el.getAttribute('role'),
                selected: el.getAttribute('aria-selected'),
                current: el.getAttribute('aria-current'),
                pressed: el.getAttribute('aria-pressed'),
                checked: el.getAttribute('aria-checked'),
                dataselected: el.getAttribute('data-selected'),
            },
            matchesBackstop: el.matches(':is([aria-selected="true"],[data-selected="true"],[class*="_selected"])'),
            ownColor: cs.color,
            blacks: blacks.slice(0, 6),
            text: el.textContent.trim().slice(0, 30),
        });
    }
    return out;
})()`);

console.log("扫描元素: " + report.scanned + "   深蓝背景: " + report.navyCount + " 个\n");
for (const row of report.rows) {
    console.log("-- " + row.tag + "  class=" + (row.cls || "(none)"));
    console.log("   attrs=" + JSON.stringify(row.attrs));
    console.log("   命中皮肤兜底选择器: " + row.matchesBackstop);
    console.log("   自身 color=" + row.ownColor + "   文本=" + JSON.stringify(row.text));
    console.log("   黑色后代: " + (row.blacks.length ? row.blacks.length + " 个 -> " + row.blacks.join(", ") : "无"));
}

ws.close();
chrome.kill();
