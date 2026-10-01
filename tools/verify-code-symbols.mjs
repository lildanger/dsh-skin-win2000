// Check that a code block's mixed content resolves as intended: Latin and box drawing
// from the 8-tall face, Chinese from CJKV18.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9370;
const PROFILE = `${process.env.TEMP}\\dsh-code-symbols`;
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
await send("DOM.enable", {}, sessionId);
await send("CSS.enable", {}, sessionId);
const WEB_PORT = process.argv[2] ?? "3081";
await send("Page.navigate", { url: `http://127.0.0.1:${WEB_PORT}/` }, sessionId);

const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 45000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) await sleep(700);
await sleep(2500);

await evaluate(`(() => {
    document.body.setAttribute('data-dsh-skin-pixel', '');
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:8px;bottom:8px;font-size:32px;line-height:1.3;z-index:9999';
    host.innerHTML =
        '<pre style="margin:0"><code id="c-latin">const x = 1;</code></pre>' +
        '<pre style="margin:0"><code id="c-tree">├── fonts/</code></pre>' +
        '<pre style="margin:0"><code id="c-block">██▒░</code></pre>' +
        '<pre style="margin:0"><code id="c-arrow">→ ←</code></pre>' +
        '<pre style="margin:0"><code id="c-cjk">中文注释</code></pre>';
    document.body.appendChild(host);
})()`);
await sleep(2500);

const { root } = await send("DOM.getDocument", { depth: -1 }, sessionId);
const targets = [
    ["#c-latin", "代码：英文"],
    ["#c-tree", "代码：目录树 ├──"],
    ["#c-block", "代码：方块 ██▒░"],
    ["#c-arrow", "代码：箭头 →←"],
    ["#c-cjk", "代码：中文"],
];
console.log("代码块里的实际字体：\n");
for (const [sel, label] of targets) {
    const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector: sel }, sessionId);
    if (!nodeId) { console.log(label + " 节点未找到"); continue; }
    const { fonts } = await send("CSS.getPlatformFontsForNode", { nodeId }, sessionId);
    console.log(label.padEnd(18) + "→ " + fonts.map((f) => f.familyName + "(" + f.glyphCount + ")").join("  "));
}

ws.close();
chrome.kill();
