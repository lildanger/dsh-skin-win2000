// Minimal runnable check for the win2000 skin bundle (no browser needed):
// loads client.js with a stubbed module loader, React and DOM, then asserts the
// specification numbers, the stylesheet, the settings panel and the specimen
// window's interactions, plus the dispose path.
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const source = readFileSync(new URL("./client.js", import.meta.url), "utf8");

let bundle;
const attributes = new Map();
const storage = new Map();
const effects = [];
const slots = [];

const body = {
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
};
const sandbox = {
    window: { __ModuleLoader__: { load: (entry) => { bundle = entry; } } },
    localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
    },
    document: {
        createElement: () => ({ dataset: {}, textContent: "", remove() {} }),
        head: { append() {} },
        body,
        documentElement: { style: { set colorScheme(value) { attributes.set("color-scheme", value); } } },
    },
};
runInContext(source, createContext(sandbox));

// Drop line and block comments so documentation cannot trip the code assertions.
const stripComments = (text) => text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const equal = (actual, expected, what) => assert(actual === expected, `${what}\n  expected: ${expected}\n  actual:   ${actual}`);

/**
 * State harness: every component instance owns its own state array, and a
 * re-render mutates that same array — exactly how a React mount keeps the state
 * it already committed. The active hook window lives on a stack, and
 * `createElement` renders nested function components through it, so a parent's
 * remaining hooks are never stolen by a child (the settings panel mounts the
 * specimen window, which has five hooks of its own).
 */
const plugin = bundle.factory((id) => {
    assert(id === "react", `the client half may only require react, got ${id}`);
    return {
        createElement: (type, props, ...children) => {
            const element = { type, props: props ?? {}, children };
            if (typeof type !== "function") return element;
            const states = childStates.get(type) ?? [];
            childStates.set(type, states);
            return call(type, states);
        },
        useState: (initial) => {
            assert(renderStack.length > 0, "a hook ran outside the harness");
            const active = renderStack.at(-1);
            const states = active.states;
            const index = active.next++;
            if (index >= states.length) states.push(typeof initial === "function" ? initial() : initial);
            return [states[index], (next) => { states[index] = next; }];
        },
        useRef: (initial) => ({ current: initial ?? null }),
    };
});

/** Hook windows of nested component types (state persists per component type). */
const childStates = new Map();
/** Active hook window; nested component bodies push and pop their own. */
const renderStack = [];
const call = (component, states) => {
    renderStack.push({ states, next: 0 });
    try {
        return component();
    } finally {
        renderStack.pop();
    }
};

/** A named instance of one component, so tests never inherit each other's state. */
const instances = new Map();
const instance = (key) => {
    const states = instances.get(key);
    assert(states !== undefined, `no instance registered for ${key}`);
    return states;
};
/** Render a named instance: `render("window", plugin.ClassicWindow)`. */
const render = (key, component) => {
    if (!instances.has(key)) instances.set(key, []);
    return call(component, instance(key));
};

equal(bundle.id, "dsh-skin-win2000", "bundle id must match the package");
assert(typeof plugin.apply === "function", "the client half must export apply");
assert(Array.isArray(plugin.inject) && plugin.inject[0] === "slots", `the skin needs the slots service, got ${JSON.stringify(plugin.inject)}`);

// ---- the specification, as the design states it -------------------------
const spec = plugin.SPEC;
equal(spec.surface, "#D4D0C8", "control surface (Windows control grey)");
equal(spec.titlebarActive, "linear-gradient(90deg,#0A246A 0%,#A6CAF0 100%)", "active title bar");
equal(spec.titlebarInactive, "linear-gradient(90deg,#808080 0%,#C0C0C0 100%)", "inactive title bar (inactive gradient end)");
equal(spec.outset, "inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080", "outset bevel");
equal(spec.inset, "inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF", "inset bevel");
equal(spec.active, "inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF", "pressed bevel");
equal(spec.fontSize, "11px", "type size");
equal(spec.smoothing, "none", "font smoothing");
equal(spec.textShadow, "#404040", "title text shadow");
equal(spec.highlight, "#F5F5F5", "highlight (3D highlight step; pure white is replaced by grey)");

// ---- the stylesheet those constants feed --------------------------------
let stylesheet;
sandbox.document.head.append = (tag) => { stylesheet = tag; };
const ctx = {
    effect(callback) {
        const cleanup = callback();
        assert(typeof cleanup === "function", "every effect must return its cleanup");
        effects.push(cleanup);
    },
    slots: {
        inject(name, register) { slots.push(name); register(); },
        register(options) { slots.push(`${options.name}#${options.id}`); },
    },
};

plugin.apply(ctx);

assert(stylesheet !== undefined, "apply must inject a stylesheet");
const css = stylesheet.textContent;
assert(css.includes('body[data-dsh-skin="win2000"]'), "the stylesheet must be scoped to the skin attribute");
assert(css.includes(`--dsh-skin-shadow-raised:${spec.outset}`), "the outset bevel must reach the stylesheet verbatim");
assert(css.includes(`--dsh-skin-shadow-sunken:${spec.inset}`), "the inset bevel must reach the stylesheet verbatim");
assert(css.includes(`--dsh-skin-shadow-active:${spec.active}`), "the pressed bevel must reach the stylesheet verbatim");
assert(css.includes(`--dsh-skin-titlebar-active:${spec.titlebarActive}`), "the active gradient must reach the stylesheet");
assert(css.includes(`--dsh-skin-titlebar-inactive:${spec.titlebarInactive}`), "the inactive gradient must reach the stylesheet");
assert(css.includes("font-size:11px"), "the interface type size must be 11px");
assert(css.includes("-webkit-font-smoothing:none"), "font smoothing must be off");
assert(!css.includes("font-family:Tahoma"), "the skin must never take over the user's typeface");
assert(!css.includes("data-dsh-skin-font"), "the skin must not carry a font switch");
assert(css.includes("--dsw-alias-bg-base:#D4D0C8 !important"), "the work area must take the same grey as the controls");
assert(css.includes("--dsw-alias-bg-layer-1:#FFFFFF !important") === false, "no layer may fall back to white");
assert(css.includes("--dsw-alias-markdown-code-block:#C8C4BC !important"), "code surfaces must be a deeper grey than the chrome");
assert(css.includes("--dsw-alias-markdown-inline-code:#C8C4BC !important"), "inline code must match the code surface");
assert(css.includes("--dsw-alias-markdown-code-block-banner:#BFBBB2 !important"), "the code banner must be deeper still");
assert(css.includes("--dsh-skin-frame:4px"), "the window frame inset must be one shared variable");
assert(css.includes("--dsw-alias-bg-layer-2:#D4D0C8 !important"), "popovers must sit on the control grey");
assert(css.includes("--dsw-alias-bg-layer-3:#D4D0C8 !important"), "floating windows must sit on the control grey");
assert(!/background(?:-color)?:[^;{}]*#EDEDED/i.test(stripComments(css)), "no near-white may fill any surface");
assert(!/:is\([^)]*\bbutton\b[^)]*\)\{[^}]*background:#D4D0C8/.test(css), "the control fill rule must not touch real <button> elements: primary and ghost fills live there");
assert(css.includes(":is([role=\"button\"],[role=\"tab\"],[role=\"option\"],[role=\"menuitem\"])"), "the control fill rule targets role-based rows only");
assert(/border-radius:0 !important/.test(css), "square corners must outrank the component radii with !important");
// 394 radius declarations across the client plugins read these six tokens, so
// zeroing the tokens is what actually squares the interface.
for (const token of ["--dsw-radius-xs", "--dsw-radius-sm", "--dsw-radius-md", "--dsw-radius-lg", "--dsw-radius-xl", "--dsw-radius-panel"]) {
    assert(css.includes(token + ":0px !important"), "radius token " + token + " must be zeroed at the source");
}
assert(css.includes("--dsw-corner-shape:round"), "the superellipse must stay a plain corner");
assert(!/:where\([^)]*\)\{[^}]*border-radius/.test(css), "the square-corner rule may not use :where(), whose specificity is zero");
assert(!/#(?:FFFFFF|ffffff)\b/.test(css), "no pure white may survive anywhere in the skin");
assert(css.includes('font-family:"unsciiCJKV18","unsciiCJKV"'), "unsciiCJKV18 must lead the type stack");
assert(css.includes("font-synthesis:none !important"), "synthetic bold must stay off: the face carries one weight, and a synthesised stroke blurs the pixel grid");
assert(css.includes("text-rendering:optimizeSpeed"), "the pixel face must snap glyphs to whole pixels: optimizeSpeed does, geometricPrecision explicitly does not");
assert(!css.includes("geometricPrecision"), "geometricPrecision defeats the pixel grid and fringes every 1px stem");
assert(css.includes(":is(strong,b){text-shadow:1px 0 0 currentColor"), "emphasis must be overprinted one pixel, not synthetically emboldened");
// Borrowing a system bold face was tried and reverted: Consolas advances 8.8px
// against the pixel grid's 8px, so every Latin column drifted ~10% and the
// layout came apart. Any bold face used here must share the grid's metrics.
assert(!css.includes("Win2003 Latin"), "no borrowed Latin face: its advance must match the 8px pixel grid exactly");
assert(!css.includes("data-dsh-skin-mono"), "the code font axis must be gone: the code face follows the interface face");
assert(css.includes(":is(button,summary)"), "real controls must carry the classic bevel");
assert(!/:is\([^)]*\[role="button"\][^)]*\)\{box-shadow/.test(css), "chat rows with role=button must never be beveled: tool calls and reasoning rows stay borderless");
assert(css.includes(':is([role="dialog"],[role="alertdialog"]){box-shadow:inset 1px 1px 0 #F5F5F5'), "a real dialog keeps its raised frame");
// A bevel rule must never be flattened to the attribute's own specificity.
const flattened = stripComments(css).split("\n").filter((line) => line.includes(":where(") && line.includes("box-shadow"));
assert(flattened.length === 0, "no bevel rule may use :where(): got " + JSON.stringify(flattened));
assert(css.includes("::-webkit-scrollbar-thumb"), "the classic scrollbar must be skinned");
// The scrollbar subtree is not reachable through `*`, so it carries its own rule;
// the thumb appears earlier in the sheet with only background and shadow.
const scrollbarRule = css.split(String.fromCharCode(10)).find((line) => line.includes("*::-webkit-scrollbar,") && line.includes("::-webkit-scrollbar-thumb"));
assert(scrollbarRule !== undefined, "the scrollbar parts need their own rule: `*` never reaches pseudo-elements");
assert(scrollbarRule.includes("border-radius:0 !important"), "the scrollbar parts must be square");
assert(css.includes("[data-dsh-skin-window]"), "the specimen window must be styled by the same sheet");
const tokenCount = [...css.matchAll(/--dsw-[a-z0-9-]+:/g)].length;
equal(tokenCount, 250, "token declarations: the Windows 2003 palette, the static ramp and the six radius tokens");
const shikiCount = [...css.matchAll(/--shiki-[a-z-]+:/g)].length;
equal(shikiCount, 11, "syntax colours must be re-tuned for the deep grey code surface");
assert(css.includes("--shiki-background:#C8C4BC"), "the syntax background must match the code surface");
assert(css.includes("--dsw-static-neutral-00:#EDEDED !important"), "the static ramp may not fall back to white");
assert(css.includes("--dsw-linear-gradient-think:linear-gradient(180deg,#D4D0C8"), "the reasoning wash must be repainted");

// ---- projection ---------------------------------------------------------
equal(body.getAttribute("data-dsh-skin"), "win2000", "apply must dress the document");
equal(body.getAttribute("data-dsh-skin-variant"), "luna", "the skin is Windows 2003 Luna");
equal(body.getAttribute("data-dsh-skin-pixel"), "unsciicjkv", "apply must turn the CJKV18 face on");
equal(attributes.get("color-scheme"), "light", "the skin must pin the light color scheme");
assert(slots.includes("shell.overlay#dsh-skin-win2000-settings"), "the settings panel must be registered into shell.overlay");

// ---- the specimen window ------------------------------------------------
const find = (node, predicate) => {
    if (node === null || typeof node !== "object") return null;
    if (predicate(node)) return node;
    for (const child of node.children ?? []) {
        const hit = find(child, predicate);
        if (hit) return hit;
    }
    return null;
};
const byAttribute = (node, name) => find(node, (child) => child.props?.[name] !== undefined);

let window = render("window", plugin.ClassicWindow);
equal(window.props["data-dsh-skin-window"], "", "the specimen must carry the window attribute");
equal(window.props["data-dsh-skin-inactive"], "false", "the specimen starts active");
equal(window.props.role, "dialog", "the specimen is a dialog");

const titleText = byAttribute(window, "data-dsh-skin-titletext");
equal(titleText.children[0], "示例对话框", "title bar text");
const closeButton = find(window, (child) => child.props?.["aria-label"] === "关闭");
assert(closeButton !== null, "the window needs a close button");
const minButton = find(window, (child) => child.props?.["aria-label"] === "最小化");
equal(minButton.children[0], "\u2013", "minimize glyph");
const maxButton = find(window, (child) => child.props?.["aria-label"] === "最大化");
equal(maxButton.children[0], "\u25A1", "maximize glyph");
equal(closeButton.children[0], "\u00D7", "close glyph");

const menuBar = byAttribute(window, "data-dsh-skin-menubar");
equal(menuBar.children.length, 4, "menu bar entry count");
equal(menuBar.children.map((button) => button.children[0]).join("|"), "文件|编辑|查看|帮助", "menu bar labels");

assert(byAttribute(window, "data-dsh-skin-client") !== null, "the client area must be sunken");
const statusBar = byAttribute(window, "data-dsh-skin-status");
equal(statusBar.children.length, 3, "status bar panel count");
equal(statusBar.children[0].children[0], "就绪", "status bar text");
const actions = byAttribute(window, "data-dsh-skin-actions").children;
equal(actions.map((button) => button.children[0]).join("|"), "激活(&A)|确定|取消", "action button row");

// Drive the interactions the specimen advertises.
minButton.props.onClick();
window = render("window", plugin.ClassicWindow);
equal(find(window, (child) => child.props?.["aria-label"] === "最小化").props["aria-pressed"], "true", "minimize must press");
menuBar.children[0].props.onClick();
window = render("window", plugin.ClassicWindow);
assert(byAttribute(window, "data-dsh-skin-menu") !== null, "a menu must open its dropdown");
closeButton.props.onClick();
window = render("window", plugin.ClassicWindow);
equal(window.props["data-dsh-skin-inactive"], "true", "closing must show the inactive title bar");
find(window, (child) => child.children?.[0] === "激活(&A)").props.onClick();
window = render("window", plugin.ClassicWindow);
equal(window.props["data-dsh-skin-inactive"], "false", "activating must restore the active gradient");

// ---- the settings panel -------------------------------------------------
let panel = render("settings", plugin.SkinSettings);
const rowLabels = panel.children.filter((child) => child?.type === "button").map((child) => child.children.at(-1));
equal(rowLabels.join("|"), "启用皮肤|点阵字体|窗口示例", "settings panel rows");

/** Find a panel row by its label — the separators shift raw indices. */
const row = (node, label) => {
    const item = find(node, (child) => child?.props?.["aria-pressed"] !== undefined && child.children?.at(-1) === label);
    assert(item !== null, `the panel has no ${label} row`);
    assert(item.props.disabled !== true, `the ${label} row is disabled`);
    return item;
};
equal(body.getAttribute("data-dsh-skin-pixel"), "unsciicjkv", "the CJKV18 face must be on by default");
row(panel, "点阵字体").props.onClick();
equal(body.getAttribute("data-dsh-skin-pixel"), null, "turning the pixel face off must clear data-dsh-skin-pixel");
panel = render("settings", plugin.SkinSettings);
assert(row(panel, "点阵字体").props["aria-pressed"] === "false", "the pixel row must read as unselected while off");
row(panel, "点阵字体").props.onClick();
equal(body.getAttribute("data-dsh-skin-pixel"), "unsciicjkv", "turning the pixel face back on must restore it");

// The code face is not adjustable: it follows the interface face, and the
// panel must not grow a selector for it again.
panel = render("settings", plugin.SkinSettings);
assert(find(panel, (child) => child.props?.["data-dsh-skin-select"] !== undefined) === null, "the panel must not carry a code font selector");
equal(body.getAttribute("data-dsh-skin-mono"), null, "no code font attribute may be projected");

panel = render("settings", plugin.SkinSettings);
row(panel, "窗口示例").props.onClick();
// A committed setState re-renders; the tree that shows the window is the next one.
panel = render("settings", plugin.SkinSettings);
assert(find(panel, (child) => child.props?.["data-dsh-skin-window"] !== undefined) !== null, "the panel must be able to show the specimen");
panel = render("settings", plugin.SkinSettings);
row(panel, "启用皮肤").props.onClick();
equal(body.getAttribute("data-dsh-skin"), null, "switching the skin off must strip every attribute");
equal(body.getAttribute("data-dsh-skin-variant"), null, "switching off must clear the palette attribute");
equal(body.getAttribute("data-dsh-skin-pixel"), null, "switching off must clear the pixel font attribute");
equal(attributes.get("color-scheme"), "", "switching off must release the color scheme");
row(render("settings", plugin.SkinSettings), "启用皮肤").props.onClick();
equal(body.getAttribute("data-dsh-skin"), "win2000", "switching back on must dress the document again");

// Panel chrome: a draggable title bar and a fold switch that survives a re-render.
panel = render("settings", plugin.SkinSettings);
const panelBar = find(panel, (child) => child.props?.["data-dsh-skin-panelbar"] !== undefined);
assert(panelBar !== null, "the panel needs a title bar to drag");
assert(typeof panelBar.props.onPointerDown === "function" && typeof panelBar.props.onPointerMove === "function", "the title bar must carry the drag handlers");
const foldButton = panelBar.children.find((child) => child.props?.["data-dsh-skin-fold"] !== undefined);
assert(foldButton !== undefined, "the title bar needs a fold switch");
foldButton.props.onClick();
panel = render("settings", plugin.SkinSettings);
equal(panel.props["data-dsh-skin-folded"], "", "folding must collapse the panel to its title bar");
assert(JSON.parse(storage.get("dsh.skin.win2000.ui")).folded === true, "the folded state must be remembered");
panel = render("settings", plugin.SkinSettings);
const foldAgain = find(panel, (child) => child.props?.["data-dsh-skin-fold"] !== undefined);
assert(foldAgain !== null, "the folded panel must still carry its fold switch");
foldAgain.props.onClick();
panel = render("settings", plugin.SkinSettings);
equal(panel.props["data-dsh-skin-folded"], undefined, "unfolding must restore the rows");

for (const cleanup of effects) cleanup();
equal(body.getAttribute("data-dsh-skin"), null, "dispose must strip the skin attribute");
equal(attributes.get("color-scheme"), "", "dispose must release the color scheme");
equal(storage.get("dsh.skin.win2000"), undefined, "dispose must drop the remembered choices");

console.log(`ok — spec verified, ${tokenCount} tokens, ${css.length} bytes of CSS, specimen window driven, panel driven, dispose clean`);
