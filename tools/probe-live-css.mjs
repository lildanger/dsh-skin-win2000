// The bundle ships source text: ${TOKEN_SLOT} and @@TOKENS@@ are resolved in the
// browser, so grepping the bundle can never prove a token landed. Read the sheet
// the page actually injected instead.
import { spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9348;
const PROFILE = `${process.env.TEMP}\\dsh-live-css-profile`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tokens to confirm, straight out of the skin's own table.
const source = readFileSync("client.js", "utf8");
const wanted = [...source.matchAll(/"(--(?:dsw|shiki)[a-z0-9-]+)":\s*"(#[0-9A-Fa-f]+)"/g)]
    .map(([, name, value]) => ({ name, value }))
    .filter((token, index, all) => all.findIndex((t) => t.name === token.name) === index);
console.log("待核对 token: " + wanted.length + " 个\n");

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
let sheet = null;
while (Date.now() < deadline && sheet === null) {
    sheet = await evaluate(`(() => {
        const tag = document.querySelector('style[data-dsh-skin]');
        return tag ? tag.textContent : null;
    })()`);
    if (sheet === null) await sleep(700);
}
if (sheet === null) throw new Error("the skin stylesheet never appeared");
console.log("注入的样式表: " + sheet.length + " 字符\n");

let missing = 0;
let wrong = 0;
for (const { name, value } of wanted) {
    const hit = sheet.match(new RegExp(name.replace(/-/g, "\\-") + ":([^;!]+)"));
    if (hit === null) { missing++; console.log("  缺失 " + name); continue; }
    const actual = hit[1].trim().toUpperCase();
    if (actual !== value.toUpperCase()) { wrong++; console.log("  不一致 " + name + ": 期望 " + value + " 实际 " + hit[1]); }
}
console.log("核对 " + wanted.length + " 个 token: 缺失 " + missing + "，不一致 " + wrong);
console.log(missing + wrong === 0 ? "ok — 皮肤注入的样式表与 token 表完全一致" : "!! 有 token 没有正确落地");

// Also confirm the resolved stylesheet carries no unresolved slot.
console.log("槽位是否残留: " + sheet.includes("@@"));
const link = sheet.match(/--dsw-alias-link:([^;!]+)/);
console.log("链接色实测: " + (link ? link[1].trim() : "未找到"));

ws.close();
chrome.kill();
