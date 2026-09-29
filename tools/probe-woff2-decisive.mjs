// Decisive check: declare a second family that points ONLY at the packaged woff2
// (no local() fallback) and see whether the browser can load it. If it loads, the
// served file is genuinely usable as a webfont; if it errors, the wrong MIME is
// being rejected and the visible face is really the locally installed one.
//
// Own headless profile; the user's browser is not touched.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9358;
const PROFILE = `${process.env.TEMP}\\dsh-fontprobe2-profile`;
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
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('style[data-dsh-skin]')"))) await sleep(700);
await sleep(2500);

const out = await evaluate(`(async () => {
    const results = {};
    const addProbe = async (label, src) => {
        const style = document.createElement('style');
        style.textContent = '@font-face{font-family:"' + label + '";src:' + src + ';font-display:block}';
        document.head.appendChild(style);
        const probe = document.createElement('span');
        probe.style.cssText = 'position:fixed;left:-9999px;font:16px "' + label + '"';
        probe.textContent = '中文ABC';
        document.body.appendChild(probe);
        let loaded = 'ok';
        try { await document.fonts.load('16px "' + label + '"', '中文ABC'); } catch (e) { loaded = 'throw: ' + e.message; }
        const face = [...document.fonts].find((f) => f.family === label);
        results[label] = { status: face ? face.status : 'absent', load: loaded, usable: document.fonts.check('16px "' + label + '"') };
        probe.remove();
    };
    await addProbe('probe-woff2', 'url("/api/dsh-skin-win2000/fonts/unsciiCJKV18.woff2") format("woff2")');
    await addProbe('probe-otf', 'url("/api/dsh-skin-win2000/fonts/unsciiCJKV18.otf") format("opentype")');
    await addProbe('probe-local', 'local("unsciiCJKV18")');
    return results;
})()`);

console.log("注入只有单一来源的字体，看浏览器能否加载：\n");
for (const [label, r] of Object.entries(out)) {
    console.log("  " + label.padEnd(14) + "status=" + String(r.status).padEnd(9) + "usable=" + String(r.usable).padEnd(6) + " load=" + r.load);
}
const woff2Ok = out["probe-woff2"]?.usable === true;
console.log("\n结论: " + (woff2Ok
    ? "包内 woff2 能被浏览器正常加载 —— 路径与文件都没问题"
    : "包内 woff2 加载失败 —— 浏览器在拒绝它，界面实际用的是本机同名安装"));

ws.close();
chrome.kill();
