// Capture real screenshots of the running DSH Web GUI through the Chrome
// DevTools Protocol, so the README shows the actual skin rather than a drawing.
//
// Usage: node tools/capture.mjs [--url http://127.0.0.1:3080/] [--out docs/screenshots-real]
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const args = process.argv.slice(2);
const argOf = (name, fallback) => {
    const at = args.indexOf(name);
    return at >= 0 && args[at + 1] !== undefined ? args[at + 1] : fallback;
};
const URL_TARGET = argOf("--url", "http://127.0.0.1:3080/");
const OUT = argOf("--out", "docs/screenshots-real");
const PORT = Number(argOf("--port", "9333"));
const PROFILE = `${process.env.TEMP}\\dsh-capture-profile`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars=false",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--window-size=1440,900",
    "about:blank",
], { stdio: "ignore", detached: false });

/** Wait for the DevTools endpoint to answer, then return the browser websocket URL. */
const endpoint = async () => {
    for (let i = 0; i < 60; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
            const json = await res.json();
            if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
        } catch {
            /* not up yet */
        }
        await sleep(500);
    }
    throw new Error("DevTools endpoint never came up");
};

const wsUrl = await endpoint();
const ws = new WebSocket(wsUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
});

let nextId = 1;
const pending = new Map();
const events = [];
ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id !== undefined && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
    }
    events.push(msg);
});
const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

// Attach to a page target and drive it flat (one session at a time).
const { targetInfos } = await send("Target.getTargets");
const page = targetInfos.find((t) => t.type === "page");
if (!page) throw new Error("no page target");
const { sessionId } = await send("Target.attachToTarget", { targetId: page.targetId, flatten: true });

await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride",
    { width: 1440, height: 900, deviceScaleFactor: 1.5, mobile: false }, sessionId);

await send("Page.navigate", { url: URL_TARGET }, sessionId);

/** Poll a page expression until it is truthy or the deadline passes. */
const waitFor = async (expression, timeoutMs, label) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const { result } = await send("Runtime.evaluate",
            { expression, returnByValue: true, awaitPromise: false }, sessionId);
        if (result?.value) return result.value;
        await sleep(500);
    }
    throw new Error(`timed out waiting for ${label}`);
};

// The boot manifest resolves, the skin mounts, and the stylesheet lands.
await waitFor("globalThis.__DSH_BOOT__ !== undefined", 30000, "boot manifest");
const skinState = await waitFor(
    `(() => {
        const tag = document.querySelector('style[data-dsh-skin]');
        const on = document.body.getAttribute('data-dsh-skin');
        return tag && on ? { on, css: tag.textContent.length } : null;
    })()`,
    30000,
    "skin stylesheet",
);
console.log("皮肤已挂载:", JSON.stringify(skinState));
await waitFor("document.querySelector('[data-dsh-skin-panel]') !== null", 30000, "settings panel");
await sleep(3000);

const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, sessionId);
    writeFileSync(`${OUT}/${name}`, Buffer.from(data, "base64"));
    console.log(`  ${name}`);
};

await shot("01-main-window.png");

// Second shot: open the classic window specimen through the panel row.
await send("Runtime.evaluate", {
    expression: `(() => {
        const rows = [...document.querySelectorAll('[data-dsh-skin-panel] button')];
        const row = rows.find((b) => b.textContent.includes('窗口示例'));
        if (row) row.click();
        return row ? 'clicked' : 'not found';
    })()`,
    returnByValue: true,
}, sessionId);
await waitFor("document.querySelector('[data-dsh-skin-window]') !== null", 10000, "specimen window");
await sleep(1200);
await shot("02-classic-window.png");

// Third shot: the settings surface, where the skin has to style real form
// controls (fields, switches, cards) rather than the conversation chrome.
await send("Runtime.evaluate", {
    expression: `(() => {
        const close = document.querySelector('[data-dsh-skin-window] [data-dsh-skin-actions] button');
        if (close) close.click();
        const rows = [...document.querySelectorAll('[data-dsh-skin-panel] button')];
        const row = rows.find((b) => b.textContent.includes('窗口示例'));
        if (row) row.click();
        const settings = [...document.querySelectorAll('button,a')]
            .find((el) => el.textContent.trim() === '设置');
        if (settings) settings.click();
        return settings ? 'settings clicked' : 'settings entry not found';
    })()`,
    returnByValue: true,
}, sessionId);
await sleep(4000);
await shot("03-settings.png");

ws.close();
chrome.kill();
console.log("完成，输出目录: " + OUT);
