// Turn the panel's two-state fold into a three-stage cycle:
// 0 = full panel, 1 = title bar only, 2 = a single small plus button.
import { readFileSync, writeFileSync } from "node:fs";

const file = "client.js";
// The working copy carries CRLF; the anchors below are written with LF, and the
// file is saved back as LF.
let s = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
let edits = 0;
const swap = (from, to, label) => {
    if (!s.includes(from)) throw new Error("anchor missing: " + label);
    s = s.replace(from, to);
    edits++;
};

// 1. Stored state: stage replaces the boolean, and an old folded flag maps to stage 1.
swap(
    `                return {
                    x: Number.isFinite(parsed.x) ? parsed.x : null,
                    y: Number.isFinite(parsed.y) ? parsed.y : null,
                    folded: parsed.folded === true,
                };
            } catch {
                return { x: null, y: null, folded: false };
            }`,
    `                const stage = Number.isInteger(parsed.stage)
                    ? Math.min(2, Math.max(0, parsed.stage))
                    : parsed.folded === true ? 1 : 0;
                return {
                    x: Number.isFinite(parsed.x) ? parsed.x : null,
                    y: Number.isFinite(parsed.y) ? parsed.y : null,
                    stage,
                };
            } catch {
                return { x: null, y: null, stage: 0 };
            }`,
    "readUi",
);

// 2. Drag: the mini button must be draggable even though it is the fold control.
swap(
    `            const onPointerDown = (event) => {
                if (event.target.closest("[data-dsh-skin-fold]") !== null) return;`,
    `            const onPointerDown = (event, fromMini = false) => {
                if (!fromMini && event.target.closest("[data-dsh-skin-fold]") !== null) return;`,
    "onPointerDown signature",
);

// 3. Height used for viewport clamping follows the stage.
swap(
    "            const panelHeight = ui.folded ? 24 : 240;",
    "            const panelHeight = ui.stage === 0 ? 240 : 24;",
    "panelHeight",
);

// 4. One cycle handler for every stage transition.
swap(
    `            const titleBar = React.createElement("div", {`,
    `            /** 0 -> 1 -> 2 -> 0: full, title bar, single plus. */
            const cycleStage = () => {
                const next = (ui.stage + 1) % 3;
                let nextY = ui.y;
                if (next === 0 && ui.y !== null && typeof window !== "undefined") {
                    nextY = Math.max(8, Math.min(ui.y, window.innerHeight - 250));
                }
                chrome({ stage: next, y: nextY });
            };

            const titleBar = React.createElement("div", {`,
    "cycleStage",
);

// 5. The title-bar button now reports the stage and cycles.
swap(
    `                "aria-expanded": ui.folded ? "false" : "true",
                title: ui.folded ? "展开设置" : "收起设置",
                onClick: () => {
                    const nextFolded = !ui.folded;
                    let nextY = ui.y;
                    if (!nextFolded && ui.y !== null && typeof window !== "undefined") {
                        nextY = Math.max(8, Math.min(ui.y, window.innerHeight - 250));
                    }
                    chrome({ folded: nextFolded, y: nextY });
                },
            }, ui.folded ? "+" : "\\u2013"));

            if (ui.folded) {
                return React.createElement("div", { "data-dsh-skin-panel": "", "data-dsh-skin-folded": "", style }, titleBar);
            }`,
    `                "aria-expanded": ui.stage === 0 ? "true" : "false",
                title: ui.stage === 0 ? "收起成标题栏" : "彻底隐藏成小按钮",
                onClick: cycleStage,
            }, ui.stage === 0 ? "\\u2013" : "\\u002b"));

            if (ui.stage === 2) {
                return React.createElement("div", { "data-dsh-skin-panel": "", "data-dsh-skin-mini": "", style },
                    React.createElement("button", {
                        type: "button",
                        "data-dsh-skin-fold": "",
                        title: "展开设置",
                        onClick: cycleStage,
                        onPointerDown: (event) => { onPointerDown(event, true); },
                        onPointerMove,
                        onPointerUp,
                        onPointerCancel: onPointerUp,
                    }, "\\u002b"));
            }

            if (ui.stage === 1) {
                return React.createElement("div", { "data-dsh-skin-panel": "", "data-dsh-skin-folded": "", style }, titleBar);
            }`,
    "fold button and branches",
);

// 6. Styling for the mini stage: the panel shrinks to the button itself.
swap(
    `[data-dsh-skin-panel][data-dsh-skin-folded] [data-dsh-skin-panelbar]{margin:0}`,
    `[data-dsh-skin-panel][data-dsh-skin-folded] [data-dsh-skin-panelbar]{margin:0}
[data-dsh-skin-panel][data-dsh-skin-mini]{min-width:0;padding:2px;gap:0}
[data-dsh-skin-panel][data-dsh-skin-mini] [data-dsh-skin-fold]{width:22px;height:22px;font-size:12px;line-height:1;cursor:move}`,
    "mini styles",
);

writeFileSync(file, s);
console.log("完成 " + edits + " 处替换");
