// Verify the diff-counter colours by building the same markup the deliverables
// package emits (a card containing _added / _deleted spans) inside the live page,
// then reading what the cascade actually resolves to.
//
// Uses its own headless profile; it never touches the user's browser.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9352;
const PROFILE = `${process.env.TEMP}\\dsh-diffcolor-profile`;
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
    // Mirror the deliverables markup: a card, a header line, and the two counters
    // with the same hashed class suffixes.
    const host = document.createElement('div');
    host.className = 'hz8-rW_card';
    host.innerHTML = '<div class="hz8-rW_header"><span class="hz8-rW_added">+5</span> <span class="hz8-rW_deleted">-3</span></div>';
    // Keep it inside a card context and on screen, then remove it after measuring.
    const anchor = document.querySelector('[class*="_card"]') || document.body;
    anchor.appendChild(host);
    const added = host.querySelector('.hz8-rW_added');
    const deleted = host.querySelector('.hz8-rW_deleted');
    const out = {
        added: getComputedStyle(added).color,
        deleted: getComputedStyle(deleted).color,
        addedMatches: added.matches('[class*="_added"]'),
        deletedMatches: deleted.matches('[class*="_deleted"]'),
    };
    host.remove();
    return out;
})()`);

const ok = (actual, want) => (actual === want ? "✓" : "✗");
console.log("变更计数配色实测：");
console.log("  +数字  " + report.added + "  " + ok(report.added, "rgb(0, 128, 0)") + "   （期望绿 rgb(0,128,0) = #008000）");
console.log("  -数字  " + report.deleted + "  " + ok(report.deleted, "rgb(204, 0, 0)") + "   （期望红 rgb(204,0,0) = #CC0000）");
console.log("  选择器命中: added=" + report.addedMatches + "  deleted=" + report.deletedMatches);
console.log(report.added === "rgb(0, 128, 0)" && report.deleted === "rgb(204, 0, 0)" ? "\nok — 加减数字按语义色渲染" : "\n!! 配色未按预期落地");

ws.close();
chrome.kill();
