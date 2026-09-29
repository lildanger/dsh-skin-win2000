// Measure the whole diff palette on a live page: build a diff row (added and
// deleted) with the deliverables package's class suffixes and read every colour
// the cascade produces — row background, gutter, marker, and the counters.
//
// Own headless profile; the user's browser is never touched.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9354;
const PROFILE = `${process.env.TEMP}\\dsh-diffpalette-profile`;
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
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 45000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('style[data-dsh-skin]')"))) await sleep(700);
await sleep(2000);

const report = await evaluate(`(() => {
    // Resolve the skin's own tokens first: that is the palette the diff uses.
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    const token = (name) => {
        probe.style.color = 'var(' + name + ')';
        return getComputedStyle(probe).color;
    };
    const tokens = {
        addedBg: token('--dsw-alias-file-diff-added-bg'),
        addedGutter: token('--dsw-alias-file-diff-added-gutter'),
        addedMarker: token('--dsw-alias-file-diff-added-marker'),
        deletedBg: token('--dsw-alias-file-diff-deleted-bg'),
        deletedGutter: token('--dsw-alias-file-diff-deleted-gutter'),
        deletedMarker: token('--dsw-alias-file-diff-deleted-marker'),
        successText: token('--dsw-alias-state-success-primary'),
        errorText: token('--dsw-alias-state-error-primary'),
    };
    probe.remove();

    // Now the same markup the package renders, to see what actually lands.
    const host = document.createElement('div');
    host.className = 'hz8-rW_card';
    host.innerHTML =
        '<div class="IP6KhG_add"><span class="IP6KhG_number">12</span><span class="IP6KhG_sign">+</span>added line</div>' +
        '<div class="IP6KhG_del"><span class="IP6KhG_number">12</span><span class="IP6KhG_sign">-</span>deleted line</div>' +
        '<div class="hz8-rW_header"><span class="hz8-rW_added">+5</span><span class="hz8-rW_deleted">-3</span></div>';
    const anchor = document.querySelector('[class*="_card"]') || document.body;
    anchor.appendChild(host);
    const pick = (sel) => {
        const el = host.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, color: cs.color };
    };
    const rendered = {
        addRow: pick('.IP6KhG_add'),
        addNumber: pick('.IP6KhG_add .IP6KhG_number'),
        addSign: pick('.IP6KhG_add .IP6KhG_sign'),
        delRow: pick('.IP6KhG_del'),
        delNumber: pick('.IP6KhG_del .IP6KhG_number'),
        delSign: pick('.IP6KhG_del .IP6KhG_sign'),
        counterAdded: pick('.hz8-rW_added'),
        counterDeleted: pick('.hz8-rW_deleted'),
    };
    host.remove();
    return { tokens, rendered };
})()`);

const t = report.tokens;
const r = report.rendered;
console.log("token 解析：");
for (const [k, v] of Object.entries(t)) console.log("  " + k.padEnd(16) + v);
console.log("\n实际渲染：");
for (const [k, v] of Object.entries(r)) {
    console.log("  " + k.padEnd(16) + (v === null ? "元素不存在" : "bg=" + v.bg + "  color=" + v.color));
}

ws.close();
chrome.kill();
