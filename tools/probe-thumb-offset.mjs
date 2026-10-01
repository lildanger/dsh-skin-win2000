// Measure where the switch thumb actually sits inside its track, in both states, and
// report the box model that puts it there: padding, position, offsets, transform.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9380;
const PROFILE = `${process.env.TEMP}\\dsh-thumb-offset`;
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

const measure = `(() => {
    const sw = document.querySelector('[class*="_switch"]');
    if (!sw) return { error: 'no switch' };
    const thumb = sw.firstElementChild;
    const sr = sw.getBoundingClientRect();
    const tr = thumb.getBoundingClientRect();
    const ss = getComputedStyle(sw);
    const ts = getComputedStyle(thumb);
    const padL = parseFloat(ss.paddingLeft) || 0;
    const padR = parseFloat(ss.paddingRight) || 0;
    const padT = parseFloat(ss.paddingTop) || 0;
    const borderL = parseFloat(ss.borderLeftWidth) || 0;
    const borderR = parseFloat(ss.borderRightWidth) || 0;
    return {
        checked: sw.getAttribute('aria-checked'),
        track: { w: +sr.width.toFixed(2), h: +sr.height.toFixed(2), padL, padR, padT, borderL, borderR, box: ss.boxSizing, display: ss.display, justify: ss.justifyContent, align: ss.alignItems, position: ss.position },
        thumb: { w: +tr.width.toFixed(2), h: +tr.height.toFixed(2), position: ts.position, left: ts.left, right: ts.right, top: ts.top, margin: ts.margin, transform: ts.transform, translate: ts.translate, borderRadius: ts.borderRadius },
        gaps: {
            leftGap: +(tr.left - sr.left - padL - borderL).toFixed(2),
            rightGap: +(sr.right - borderR - padR - tr.right).toFixed(2),
            topGap: +(tr.top - sr.top - padT).toFixed(2),
            bottomGap: +(sr.bottom - (parseFloat(ss.borderBottomWidth) || 0) - (parseFloat(ss.paddingBottom) || 0) - tr.bottom).toFixed(2),
        },
    };
})()`;

const on = await evaluate(measure);
await evaluate(`(() => { const sw = document.querySelector('[class*="_switch"]'); if (sw) sw.click(); })()`);
await sleep(900);
const off = await evaluate(measure);

for (const [label, m] of [["开（aria-checked=true）", on], ["关（点击后）", off]]) {
    console.log("--- " + label + " ---");
    if (m.error) { console.log("  " + m.error); continue; }
    console.log("  轨道: " + m.track.w + "x" + m.track.h + "  padding L/R/T=" + m.track.padL + "/" + m.track.padR + "/" + m.track.padT + "  border L/R=" + m.track.borderL + "/" + m.track.borderR);
    console.log("        box=" + m.track.box + " display=" + m.track.display + " justify=" + m.track.justify + " align=" + m.track.align + " position=" + m.track.position);
    console.log("  滑块: " + m.thumb.w + "x" + m.thumb.h + "  position=" + m.thumb.position + " left=" + m.thumb.left + " right=" + m.thumb.right + " top=" + m.thumb.top);
    console.log("        margin=" + m.thumb.margin + "  transform=" + m.thumb.transform + "  translate=" + m.thumb.translate);
    console.log("  实测间隙: 左=" + m.gaps.leftGap + "  右=" + m.gaps.rightGap + "  上=" + m.gaps.topGap + "  下=" + m.gaps.bottomGap + "   ← 左右不等就是错位");
    console.log();
}

ws.close();
chrome.kill();
