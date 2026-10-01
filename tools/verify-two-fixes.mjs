// Verify both fixes in a live page:
//   1. the switch thumb now resolves to radius 0;
//   2. the family exposes two faces, and bold Latin actually measures differently
//      from regular Latin — proof the 8-tall face is being used rather than a
//      synthesised bold of the same glyphs.
//
// Own headless profile; the user's browser is not touched.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9364;
const PROFILE = `${process.env.TEMP}\\dsh-verify-two-fixes`;
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
    const el = [...document.querySelectorAll('button,a,[role="button"]')].find((n) => n.textContent.trim() === '设置');
    if (el) el.click();
})()`);
await sleep(3500);

const out = await evaluate(`(async () => {
    const result = { thumbs: [], faces: [], measure: {} };

    // 1. Switch thumbs.
    for (const sw of document.querySelectorAll('[class*="_switch"]')) {
        const thumb = sw.firstElementChild;
        if (!thumb) continue;
        result.thumbs.push({
            track: getComputedStyle(sw).borderRadius,
            thumb: getComputedStyle(thumb).borderRadius,
            size: Math.round(thumb.getBoundingClientRect().width) + 'x' + Math.round(thumb.getBoundingClientRect().height),
        });
        if (result.thumbs.length >= 4) break;
    }

    // 2. Faces in the family.
    for (const f of document.fonts) {
        if (f.family.includes('unscii')) result.faces.push({ family: f.family, weight: f.weight, status: f.status });
    }

    // 3. Measure regular vs bold Latin. The pixel face is fixed-width, so compare
    //    against a synthetic-bold expectation: if bold picks a different face, the
    //    advance width and ink height change.
    const mk = (weight, family) => {
        const s = document.createElement('span');
        s.style.cssText = 'position:fixed;left:-9999px;top:0;font-size:32px;line-height:1;white-space:pre;font-weight:' + weight + ';font-family:' + family;
        s.textContent = 'ABCDEFGHIJ';
        document.body.appendChild(s);
        const r = s.getBoundingClientRect();
        const out = { w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
        s.remove();
        return out;
    };
    await document.fonts.load('400 32px unsciiCJKV18', 'ABC');
    await document.fonts.load('700 32px unsciiCJKV18', 'ABC');
    result.measure.regular = mk(400, '"unsciiCJKV18", monospace');
    result.measure.bold = mk(700, '"unsciiCJKV18", monospace');
    result.measure.boldMonospace = mk(700, 'monospace');
    result.measure.regularMonospace = mk(400, 'monospace');
    return result;
})()`);

console.log("开关滑块：");
for (const t of out.thumbs) console.log("  轨道 radius=" + t.track + "   滑块 radius=" + t.thumb + "  (" + t.size + ")");
console.log("\nunscii 家族的 face：");
for (const f of out.faces) console.log("  " + f.family + "  weight=" + f.weight + "  status=" + f.status);
const m = out.measure;
console.log("\n英文 'ABCDEFGHIJ' 在 32px 下的宽度：");
console.log("  400  unsciiCJKV18      w=" + m.regular.w + "  h=" + m.regular.h);
console.log("  700  unsciiCJKV18      w=" + m.bold.w + "  h=" + m.bold.h + (m.bold.w !== m.regular.w ? "   ← 与 400 不同，说明换了 face" : "   ← 与 400 相同"));
console.log("  700  monospace (对照)  w=" + m.boldMonospace.w + "  h=" + m.boldMonospace.h);

ws.close();
chrome.kill();
