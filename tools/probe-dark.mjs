// End-to-end check for dark mode: read the light paint, flip the panel row, read the
// dark paint back, then walk the surfaces that carry hand-painted rules (specimen
// window, a real conversation, the settings page) and count black-on-dark text.
//
// Own headless profile; the user's browser is not touched.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9391;
const PROFILE = `${process.env.TEMP}\\dsh-dark`;
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

const WEB_PORT = process.argv[2] ?? "3080";
await send("Page.navigate", { url: `http://127.0.0.1:${WEB_PORT}/` }, sessionId);

const evaluate = async (expression) => {
    const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    return result?.value;
};
const deadline = Date.now() + 60000;
while (Date.now() < deadline && !(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) await sleep(700);
if (!(await evaluate("!!document.querySelector('[data-dsh-skin-panel]')"))) {
    console.log("皮肤面板没有挂载，放弃");
    ws.close();
    chrome.kill();
    process.exit(1);
}
await sleep(2000);

mkdirSync("workspace", { recursive: true });
const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
    writeFileSync(`workspace/${name}`, Buffer.from(data, "base64"));
};

/** Sample the paint plus count anything still rendering the light surface colour. */
const paint = () => evaluate(`(() => {
    const pick = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const s = getComputedStyle(el);
        return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow.slice(0, 44) };
    };
    let survivors = 0;
    for (const el of document.querySelectorAll('body *')) {
        const s = getComputedStyle(el);
        if (s.backgroundColor === 'rgb(212, 208, 200)' && el.getBoundingClientRect().width > 0) survivors++;
    }
    return {
        scheme: getComputedStyle(document.documentElement).colorScheme,
        darkAttribute: document.body.getAttribute('data-dsh-skin-dark'),
        stored: localStorage.getItem('dsh.skin.win2000'),
        ladder: ['surface', 'face', 'light', 'card', 'shadow', 'paper', 'fill', 'bubble', 'muted']
            .map((name) => name + '=' + getComputedStyle(document.body).getPropertyValue('--dsh-dark-' + name).trim()),
        body: pick('body'),
        sidebar: pick('[class*="_sidebarCol"]'),
        panel: pick('[data-dsh-skin-panel]'),
        lightSurvivors: survivors,
    };
})()`);

/** Black text sitting on a dark surface is unreadable, wherever it hides. */
const darkOnDark = () => evaluate(`(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
        const text = (el.children.length === 0 ? el.textContent : '').trim();
        if (!text) continue;
        const cs = getComputedStyle(el);
        if (cs.color !== 'rgb(0, 0, 0)') continue;
        let node = el;
        let bg = 'rgba(0, 0, 0, 0)';
        while (node && (bg = getComputedStyle(node).backgroundColor) === 'rgba(0, 0, 0, 0)') node = node.parentElement;
        if (!node) continue;
        const parts = bg.match(/[\\d.]+/g).map(Number);
        const lum = (0.299 * parts[0] + 0.587 * parts[1] + 0.114 * parts[2]) / 255;
        if (lum < 0.45) out.push({ text: text.slice(0, 20), bg });
    }
    return { count: out.length, samples: out.slice(0, 6) };
})()`);

const clickRow = (label) => evaluate(`(() => {
    const row = [...document.querySelectorAll('[data-dsh-skin-panel] > button')]
        .find((b) => b.textContent.trim().endsWith(${JSON.stringify(label)}));
    if (!row) return 'no row';
    row.click();
    return 'clicked';
})()`);

const before = await paint();
console.log("亮色: " + JSON.stringify(before.body));

console.log("切换暗色: " + await clickRow("暗色模式"));
await sleep(1200);
const after = await paint();
console.log("暗色: " + JSON.stringify({
    scheme: after.scheme,
    dark: after.darkAttribute,
    stored: after.stored,
    body: after.body,
    sidebar: after.sidebar,
    panel: after.panel,
    ladder: after.ladder,
    lightSurvivors: after.lightSurvivors,
}));
await shot("dark-mode.png");

// The specimen window carries the most hand-painted rules.
await clickRow("窗口示例");
await sleep(1000);
const windowPaint = await evaluate(`(() => {
    const el = document.querySelector('[data-dsh-skin-window]');
    if (!el) return null;
    const pick = (node) => { const s = getComputedStyle(node); return { bg: s.backgroundColor, color: s.color }; };
    const input = el.querySelector('[data-dsh-skin-input]');
    return {
        window: pick(el),
        client: pick(el.querySelector('[data-dsh-skin-client]')),
        input: input ? pick(input) : null,
        menu: pick(el.querySelector('[data-dsh-skin-menubar] button')),
        titleBar: getComputedStyle(el.querySelector('[data-dsh-skin-titlebar]')).backgroundImage.slice(0, 66),
    };
})()`);
console.log("暗色窗口示例: " + JSON.stringify(windowPaint));
await shot("dark-window.png");

// A real conversation exercises code blocks, tool rows and the navy selection.
const opened = await evaluate(`(() => {
    const leaf = [...document.querySelectorAll('body *')]
        .find((n) => n.children.length === 0 && n.textContent.trim().startsWith('路径图'));
    const target = leaf ? (leaf.closest('[role="button"],button,a') || leaf.parentElement) : null;
    if (!target) return 'no session row';
    target.click();
    return 'clicked';
})()`);
await sleep(2600);
const chat = await evaluate(`(() => {
    const pick = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const s = getComputedStyle(el);
        return { bg: s.backgroundColor, color: s.color };
    };
    return { url: location.href, code: pick('pre'), body: pick('body') };
})()`);
console.log("打开会话: " + opened + " → " + JSON.stringify(chat));
console.log("会话里黑字压暗底: " + JSON.stringify(await darkOnDark()));
await shot("dark-chat.png");

// Settings only exists once a workspace is open.
const settingsOpened = await evaluate(`(() => {
    const el = [...document.querySelectorAll('button,a,[role="button"]')]
        .find((n) => n.textContent.trim().startsWith('设置'));
    if (!el) return 'settings entry not found';
    el.click();
    return 'clicked';
})()`);
await sleep(2000);
const settings = await evaluate(`(() => {
    const current = [...document.querySelectorAll('[aria-current="true"]')].slice(0, 3).map((el) => ({
        text: el.textContent.trim().slice(0, 8), bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color,
    }));
    const controls = [...document.querySelectorAll('select,button[aria-haspopup],[class*="_switch"]')].slice(0, 4).map((el) => ({
        text: el.textContent.trim().slice(0, 8), bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color,
    }));
    return { url: location.href, current, controls, dark: document.body.getAttribute('data-dsh-skin-dark') };
})()`);
console.log("打开设置: " + settingsOpened + " → " + JSON.stringify(settings, null, 1));
console.log("设置页黑字压暗底: " + JSON.stringify(await darkOnDark()));
await shot("dark-settings.png");

ws.close();
chrome.kill();
console.log("截图: workspace/dark-mode.png dark-window.png dark-chat.png dark-settings.png");
