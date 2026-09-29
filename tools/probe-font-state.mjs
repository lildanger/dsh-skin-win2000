// Ask the browser what it actually did with the bundled face: did the woff2 load,
// is the family usable, and which URL won.
//
// Own headless profile; the user's browser is not touched.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9356;
const PROFILE = `${process.env.TEMP}\\dsh-fontstate-profile`;
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
const netEvents = [];
ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id !== undefined && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
    }
    if (msg.method === "Network.responseReceived" && String(msg.params?.response?.url ?? "").includes("/fonts/")) {
        netEvents.push({
            url: msg.params.response.url.split("/fonts/")[1],
            status: msg.params.response.status,
            mime: msg.params.response.mimeType,
        });
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
await send("Network.enable", {}, sessionId);
await send("Page.navigate", { url: "http://127.0.0.1:3080/" }, sessionId);

const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 45000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('style[data-dsh-skin]')"))) await sleep(700);
await sleep(4000);

const state = await evaluate(`(async () => {
    const faces = [...document.fonts].map((f) => ({ family: f.family, status: f.status, weight: f.weight }));
    // Force the family to be needed, then see whether the browser counts it ready.
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;left:-9999px;font:16px unsciiCJKV18, monospace';
    probe.textContent = '中文ABC';
    document.body.appendChild(probe);
    let ready;
    try { ready = await document.fonts.load('16px unsciiCJKV18', '中文ABC'); } catch (e) { ready = 'error: ' + e.message; }
    const check = document.fonts.check('16px unsciiCJKV18');
    probe.remove();
    return { faces, loaded: Array.isArray(ready) ? ready.length : ready, check };
})()`);

console.log("字体请求：");
if (netEvents.length === 0) console.log("  （没有发起任何 /fonts/ 请求）");
for (const e of netEvents) console.log("  " + e.status + "  " + e.mime + "  " + e.url);
console.log("\ndocument.fonts：");
for (const f of state.faces) console.log("  " + f.family + "  status=" + f.status + "  weight=" + f.weight);
console.log("\nfonts.load('16px unsciiCJKV18') 返回的 face 数: " + state.loaded);
console.log("fonts.check('16px unsciiCJKV18'): " + state.check);
console.log("\n结论: " + (state.check ? "浏览器认为该字体可用（可能来自包内 woff2，也可能来自本机同名安装）" : "浏览器无法使用该字体"));

ws.close();
chrome.kill();
