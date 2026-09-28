// Compare the shipped stylesheet against the Windows Server 2003 metrics table.
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const source = readFileSync(new URL("./client.js", import.meta.url), "utf8");
let bundle;
let captured = null;
const sandbox = {
    window: { __ModuleLoader__: { load: (entry) => { bundle = entry; } } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: {
        createElement: () => ({ dataset: {}, textContent: "", remove() {} }),
        head: { append: (tag) => { captured = tag; } },
        body: { getAttribute: () => null, setAttribute() {}, removeAttribute() {} },
        documentElement: { style: { colorScheme: "" } },
    },
};
runInContext(source, createContext(sandbox));
bundle.factory(() => ({
    createElement: () => ({}),
    useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial ?? null }),
})).apply({ effect: (callback) => callback(), slots: { inject: (name, register) => register(), register: () => {} } });

const css = captured.textContent;
let diffs = 0;
const metric = (label, expected, actual) => {
    const ok = actual !== undefined && actual.toUpperCase() === expected.toUpperCase();
    if (!ok) diffs++;
    console.log((ok ? "  ok   " : "  DIFF ") + label.padEnd(24) + " 表:" + expected.padEnd(9) + " 实际:" + (actual ?? "?"));
};
/**
 * Read one declaration out of the shipped sheet and report its first hex value.
 * The declaration is sliced first so a later value on the same line cannot win.
 */
const declared = (name) => {
    const at = css.indexOf(name + ":");
    return at < 0 ? "" : css.slice(at, css.indexOf(";", at));
};
const hexOf = (text, last) => {
    const hits = [...text.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0]);
    if (hits.length === 0) return undefined;
    return (last ? hits[hits.length - 1] : hits[0]).toUpperCase();
};

metric("控件表面 ButtonFace", "#D4D0C8", hexOf(declared("--dsw-alias-bg-base")));
metric("活动标题栏起点", "#0A246A", hexOf(declared("--dsh-skin-titlebar-active"), false));
metric("活动标题栏终点", "#A6CAF0", hexOf(declared("--dsh-skin-titlebar-active"), true));
metric("失焦标题栏起点", "#808080", hexOf(declared("--dsh-skin-titlebar-inactive"), false));
metric("失焦标题栏终点", "#C0C0C0", hexOf(declared("--dsh-skin-titlebar-inactive"), true));
metric("3D 高光 ButtonHighlight", "#F5F5F5", hexOf(declared("--dsh-skin-shadow-raised"), false));
metric("3D 投影 ButtonShadow", "#808080", hexOf(declared("--dsh-skin-shadow-raised"), true));
metric("最深投影 DarkShadow", "#404040", hexOf(declared("--dsw-alias-border-l4")));
metric("选中项 Highlight", "#0A246A", hexOf(declared("--dsw-specific-sidebar-nav-item-active")));
metric("工作区 Window", "#D4D0C8", hexOf(declared("--dsw-alias-bg-layer-1")));
console.log("  纯白出现次数: " + (css.match(/#FFFFFF/gi) ?? []).length);
console.log(diffs === 0 ? "  全部对齐度量表" : "  " + diffs + " 项待确认");
