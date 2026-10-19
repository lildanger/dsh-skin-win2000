// Dark mode on the settings surface: open 更多 -> 设置, then count black-on-dark text
// and sample the controls that matter (nav rows, selects, switches).
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/");
const WebSocket = require("C:/Users/dange/.dsh/profiles/node_modules/ws");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9392;
const PROFILE = `${process.env.TEMP}\\dsh-dark-settings`;
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
const until = async (expression, ms = 60000) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
        if (await evaluate(expression)) return true;
        await sleep(600);
    }
    return false;
};

if (!(await until("!!document.querySelector('[data-dsh-skin-panel]')"))) {
    console.log("皮肤面板没有挂载，放弃");
    process.exit(1);
}
await sleep(1500);

mkdirSync("workspace", { recursive: true });
const shot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
    writeFileSync(`workspace/${name}`, Buffer.from(data, "base64"));
};

const clickRow = (label) => evaluate(`(() => {
    const row = [...document.querySelectorAll('[data-dsh-skin-panel] > button')]
        .find((b) => b.textContent.trim().endsWith(${JSON.stringify(label)}));
    if (!row) return 'no row';
    row.click();
    return 'clicked';
})()`);

console.log("暗色: " + await clickRow("暗色模式"));
await sleep(900);

// Open Settings with its own shortcut (Ctrl+Alt+comma); clicking the sidebar entry
// depends on which footer state the app happens to be in.
await evaluate(`(() => {
    const init = { key: ',', code: 'Comma', ctrlKey: true, altKey: true, bubbles: true, cancelable: true };
    for (const node of [document.body, window]) {
        node.dispatchEvent(new KeyboardEvent('keydown', init));
        node.dispatchEvent(new KeyboardEvent('keyup', init));
    }
    return true;
})()`);
await sleep(2600);
const settings = await evaluate(`(() => document.body.innerText.includes('通用设置') ? 'settings open' : 'settings missing')()`);
console.log("打开设置: " + settings);

const scan = await evaluate(`(() => {
    const black = [];
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
        if (lum < 0.45) black.push({ text: text.slice(0, 20), bg });
    }
    const current = [...document.querySelectorAll('[aria-current="true"]')].slice(0, 3).map((el) => {
        const s = getComputedStyle(el);
        const hits = [];
        for (const sheet of document.styleSheets) {
            let rules;
            try { rules = sheet.cssRules; } catch { continue; }
            for (const rule of rules) {
                if (!rule.selectorText || !rule.style || !/background/.test(rule.style.cssText)) continue;
                try {
                    if (el.matches(rule.selectorText)) {
                        hits.push({
                            sel: rule.selectorText.slice(0, 110),
                            bg: rule.style.getPropertyValue('background') || rule.style.getPropertyValue('background-color'),
                            important: rule.style.getPropertyPriority('background-color') || rule.style.getPropertyPriority('background'),
                        });
                    }
                } catch { /* selector not matchable */ }
            }
        }
        const chain = [];
        let node = el;
        for (let i = 0; i < 3 && node; i++, node = node.parentElement) {
            const cs = getComputedStyle(node);
            chain.push({ tag: node.tagName, cls: (node.className || '').toString().slice(0, 60), bg: cs.backgroundColor });
        }
        return { text: el.textContent.trim().slice(0, 8), bg: s.backgroundColor, color: s.color, chain, hits: hits.slice(-5) };
    });
    const controls = [...document.querySelectorAll('select,[aria-haspopup],[class*="_switch"]')].slice(0, 5).map((el) => {
        const s = getComputedStyle(el);
        return { text: el.textContent.trim().slice(0, 10), bg: s.backgroundColor, color: s.color };
    });
    const heading = [...document.querySelectorAll('h1,h2,h3')].slice(0, 2).map((el) => {
        const s = getComputedStyle(el);
        return { text: el.textContent.trim().slice(0, 10), color: s.color, bg: s.backgroundColor };
    });
    return {
        url: location.href,
        dark: document.body.getAttribute('data-dsh-skin-dark'),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        blackOnDark: { count: black.length, samples: black.slice(0, 6) },
        current, controls, heading,
    };
})()`);
console.log("打开设置: " + settings);
console.log("设置页: " + JSON.stringify(scan, null, 1));
await shot("dark-settings.png");

ws.close();
chrome.kill();
