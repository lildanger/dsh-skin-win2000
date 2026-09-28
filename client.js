// dsh-skin-win2000 — client half: the Windows 2003 (Luna) chrome.
//
// The shipped Appearance row lists only light/dark/system, so a third-party
// theme id has no seat there. The skin drives the document itself:
//
//   1. one stylesheet scoped to `body[data-dsh-skin="win2000"]`, carrying the
//      Windows 2003 palette over the design
//      system's alias and specific tokens, plus what tokens cannot express:
//      square corners, the classic bevels and 3D scrollbars. The type stack
//      leads with unsciiCJKV18 while the pixel-font switch is on; switching it
//      off hands the typeface back to the user.
//      Token values carry `!important` because the theme presenter writes its
//      own tokens as body inline styles, which otherwise outrank a stylesheet.
//      The bevel rules deliberately avoid `:where()`: it would flatten them to
//      the attribute's own specificity, and every component class rule that
//      sets its own box-shadow would win — the skin would read as flat colour.
//   2. a settings panel in the shell overlay's bottom-right corner: the skin
//      switch and the pixel-font switch. Both choices live in localStorage;
//      turning the skin off leaves the stock look completely untouched.
window.__ModuleLoader__.load({
    id: "dsh-skin-win2000",
    factory: (require) => {
        const React = require("react");
        const module = { exports: {} };
        const exports = module.exports;

        const SKIN_ATTRIBUTE = "data-dsh-skin";
        const SKIN_VALUE = "win2000";
        const STORAGE_KEY = "dsh.skin.win2000";
        const PIXEL_VALUE = "unsciicjkv";

        /**
         * The Windows 2000 face: grey chrome, white work areas, navy selection,
         * hard 1px outlines. Keys are the design system's alias and specific
         * tokens (`--dsw-menu-surface-fill` among them).
         */
        const WIN2003_TOKENS = {
            /* surfaces — grey chrome, white document area, white fields */
            "--dsw-alias-bg-base": "#D4D0C8",
            "--dsw-alias-bg-layer-1": "#D4D0C8",
            "--dsw-alias-bg-layer-2": "#D4D0C8",
            "--dsw-alias-bg-layer-3": "#D4D0C8",
            "--dsw-alias-bg-document-preview": "#D4D0C8",
            "--dsw-alias-label-document-preview": "#000000",
            "--dsw-alias-bg-module-platform": "#D4D0C8",
            "--dsw-alias-bg-multi-select": "#C1C8D8",
            "--dsw-alias-bg-overlay": "#D4D0C8",
            "--dsw-alias-bg-skeleton": "#D8D4C4",
            "--dsw-alias-bg-mask-1": "#0000003d",
            "--dsw-alias-bg-mask-2": "#0000001f",
            "--dsw-alias-bg-mask-3": "#0000007a",
            "--dsw-alias-bg-mask-drop": "#d4d0c8b3",
            "--dsw-alias-bg-mask-photo": "#000000e0",

            /* window edges — the classic 3D greys */
            "--dsw-alias-border-inverted": "#EDEDED",
            "--dsw-alias-border-inverted2": "#EDEDED",
            "--dsw-alias-border-l1": "#C8C4B4",
            "--dsw-alias-border-l2": "#ACA899",
            "--dsw-alias-border-l2-darkmode-thin": "#ACA899",
            "--dsw-alias-border-l3": "#7F7F7F",
            "--dsw-alias-border-l4": "#404040",

            /* navy selection and black text */
            "--dsw-alias-brand-primary": "#003C74",
            "--dsw-alias-brand-primary-invert": "#EDEDED",
            "--dsw-alias-brand-primary-new-colorprimary-new-color": "#0A246A",
            "--dsw-alias-brand-text": "#003C74",
            "--dsw-alias-label-primary": "#000000",
            "--dsw-alias-label-primary-bluish": "#003C74",
            "--dsw-alias-label-primary-dimmed": "#000000",
            "--dsw-alias-label-primary-foreground": "#EDEDED",
            "--dsw-alias-label-primary-inverted": "#EDEDED",
            "--dsw-alias-label-secondary": "#333333",
            "--dsw-alias-label-tertiary": "#555555",
            "--dsw-alias-label-dimmed": "#808080",
            "--dsw-alias-label-caption": "#555555",
            "--dsw-alias-menu-icon": "#000000",
            "--dsw-alias-link": "#003C74",

            /* buttons — flat grey under the bevels drawn by the stylesheet */
            "--dsw-alias-button-primary-fill": "#003C74",
            "--dsw-alias-button-primary-hover": "#0A246A",
            "--dsw-alias-button-primary-dimmed": "#D4D0C8",
            "--dsw-alias-button-contrast-fill": "#404040",
            "--dsw-alias-button-elevated-fill": "#D4D0C8",
            "--dsw-alias-button-floating-fill": "#D4D0C8",
            "--dsw-alias-button-floating-hover": "#E3E0D2",
            "--dsw-alias-button-ghost-active-fill": "#C1D2EE",
            "--dsw-alias-button-ghost-active-border": "#0A246A",
            "--dsw-alias-button-ghost-active-hover": "#B4C9EA",
            "--dsw-alias-button-info-fill": "#0A246A",
            "--dsw-alias-button-info-hover": "#2456A8",
            "--dsw-alias-button-tool-bar-fill": "#D4D0C8",
            "--dsw-alias-button-tool-bar-fill-invisible": "#D4D0C880",
            "--dsw-alias-button-tool-bar-hover": "#E3E0D2",

            /* selection tint is the classic light navy */
            "--dsw-alias-interactive-bg-hover": "#0A246A1a",
            "--dsw-alias-interactive-bg-active": "#0A246A26",
            "--dsw-alias-interactive-bg-hover-accent": "#0A246A33",
            "--dsw-alias-interactive-bg-hover-danger": "#CC00001a",
            "--dsw-alias-interactive-bg-hover-solid": "#E3E0D2",

            /* message bubbles */
            "--dsw-specific-bubble": "#D4D0C8",
            "--dsw-specific-bubble-highlight": "#C1C8D8",

            /* menus, pickers, panels */
            "--dsw-menu-surface-fill": "#D4D0C8",
            "--dsw-specific-menu": "#D4D0C8",
            "--dsw-specific-selector": "#D4D0C8",
            "--dsw-specific-input-major": "#D4D0C8",
            "--dsw-specific-login-input": "#D4D0C8",
            "--dsw-specific-sidebar-fill": "#D4D0C8",
            "--dsw-specific-sidebar-nav-item-active": "#0A246A",
            "--dsw-specific-sidebar-nav-item-active-accent": "#C1C8D8",
            "--dsw-specific-sidebar-nav-item-hover": "#E4E1DC",
            "--dsw-specific-tip": "#FFFFE1",
            "--dsw-alias-toast-bg": "#FFFFE1",
            "--dsw-alias-toast-label": "#000000",
            "--dsw-alias-tooltip-bg": "#FFFFE1",
            "--dsw-alias-tooltip-key-bg": "#D4D0C8",

            /* the static ramp the components fall back to: nothing here may be white either */
            "--dsw-static-neutral-00": "#EDEDED",
            "--dsw-static-neutral-50": "#D4D0C8",
            "--dsw-static-neutral-100": "#DEDCD7",
            "--dsw-static-neutral-150": "#D8D6D1",
            /* The file-change card paints itself with --changes-fill, which the
               package binds to neutral-50; bind it to the control grey directly. */
            "--changes-fill": "#D4D0C8",
            "--changes-hover": "#E3E0D2",
            "--dsw-static-neutral-200": "#DEDCD5",
            "--dsw-static-neutral-250": "#D6D4CD",
            "--dsw-static-neutral-300": "#C8C6BF",
            "--dsw-static-neutral-400": "#A8A6A0",
            "--dsw-static-neutral-500": "#8A8884",
            "--dsw-static-neutral-550": "#787672",
            "--dsw-static-neutral-600": "#666461",
            "--dsw-static-neutral-700": "#4A4845",
            "--dsw-static-neutral-800": "#333231",
            "--dsw-static-neutral-850": "#282726",
            "--dsw-static-neutral-900": "#1E1D1C",
            "--dsw-static-neutral-1000": "#000000",
            "--dsw-static-neutral-bluish-00": "#EDEDED",
            "--dsw-static-neutral-bluish-50": "#EEEDEA",
            "--dsw-static-neutral-bluish-60": "#E9E8E4",
            "--dsw-static-neutral-bluish-75": "#E4E2DE",
            "--dsw-static-neutral-bluish-100": "#DEDCD7",
            "--dsw-static-neutral-bluish-150": "#D8D6D1",
            "--dsw-static-neutral-bluish-200": "#D2D0CB",
            "--dsw-static-neutral-bluish-300": "#C4C2BD",
            "--dsw-static-neutral-bluish-400": "#A6A4A0",
            "--dsw-static-neutral-bluish-500": "#8C8A86",
            "--dsw-static-neutral-bluish-600": "#74726E",
            "--dsw-static-neutral-bluish-700": "#5A5855",
            "--dsw-static-neutral-bluish-750": "#4C4A48",
            "--dsw-static-neutral-bluish-800": "#3C3B39",
            "--dsw-static-neutral-bluish-850": "#302F2E",
            "--dsw-static-neutral-bluish-875": "#282726",
            "--dsw-static-neutral-bluish-900": "#201F1E",
            "--dsw-static-neutral-bluish-950": "#181817",
            "--dsw-static-neutral-bluish-1000": "#0F0F0F",
            /* accents keep their hue, pulled down to the era's saturation */
            "--dsw-static-deepseek-50": "#E8ECF4",
            "--dsw-static-deepseek-100": "#D2DAEA",
            "--dsw-static-deepseek-200": "#B4C2DE",
            "--dsw-static-deepseek-300": "#8FA3CC",
            "--dsw-static-deepseek-400": "#6B84B8",
            "--dsw-static-deepseek-450": "#5A76AE",
            "--dsw-static-deepseek-500": "#0A246A",
            "--dsw-static-deepseek-600": "#081E58",
            "--dsw-static-deepseek-700-delete": "#061847",
            "--dsw-static-deepseek-800": "#051338",
            "--dsw-static-deepseek-900": "#040E29",
            "--dsw-static-blue-50": "#E8EDF6",
            "--dsw-static-blue-50p": "#E4EAF5",
            "--dsw-static-blue-75": "#DCE4F2",
            "--dsw-static-blue-100": "#CBD7EC",
            "--dsw-static-blue-300": "#8AA3CE",
            "--dsw-static-blue-400": "#6785BC",
            "--dsw-static-blue-450": "#4F72B0",
            "--dsw-static-blue-500": "#0A246A",
            "--dsw-static-blue-600": "#2456A8",
            "--dsw-static-blue-800": "#004080",
            "--dsw-static-blue-900": "#003C74",
            "--dsw-static-blue-950": "#071A4E",
            "--dsw-static-green-100": "#DCEBDC",
            "--dsw-static-green-400": "#2E7D32",
            "--dsw-static-green-500": "#008000",
            "--dsw-static-green-500-a08": "#00800014",
            "--dsw-static-green-500-a12": "#0080001f",
            "--dsw-static-green-900": "#1B3A1B",
            "--dsw-static-red-50": "#F5E4E2",
            "--dsw-static-red-100": "#EBCBC7",
            "--dsw-static-red-400": "#CC0000",
            "--dsw-static-red-400-a12": "#A800001f",
            "--dsw-static-red-500": "#CC0000",
            "--dsw-static-red-600": "#CC0000",
            "--dsw-static-red-600-a08": "#A8000014",
            "--dsw-static-red-900": "#400000",
            "--dsw-static-amber-100": "#FFF4CE",
            "--dsw-static-amber-400": "#A08000",
            "--dsw-static-amber-500": "#A08000",
            "--dsw-static-amber-600": "#7F6000",
            "--dsw-static-amber-900": "#403000",
            /* syntax colours for the deep grey code surface */
            "--shiki-foreground": "#000000",
            "--shiki-background": "#C8C4BC",
            "--shiki-token-constant": "#003C74",
            "--shiki-token-string": "#006400",
            "--shiki-token-string-expression": "#006400",
            "--shiki-token-comment": "#5A5855",
            "--shiki-token-keyword": "#A80000",
            "--shiki-token-parameter": "#5A5855",
            "--shiki-token-function": "#003C74",
            "--shiki-token-punctuation": "#333333",
            "--shiki-token-link": "#0A246A",
            /* the one gradient the theme paints behind reasoning text */
            "--dsw-linear-gradient-think": "linear-gradient(180deg,#D4D0C8 20.19%,#D4D0C800 100%)",
            "--dsw-linear-think-select": "linear-gradient(180deg,#C8C4BC 20.19%,#C8C4BC00 100%)",
            "--dsw-gradient-onboarding-violet-stops": "#0A246A 33.102%, #0A246A 50.954%, #A6CAF0 85.326%, #0A246A",
            "--dsw-gradient-onboarding-blue-stops": "#0A246A 18.75%, #0A246A 51.78%, #A6CAF0 86.252%, #0A246A",
            "--dsw-gradient-onboarding-cyan-stops": "#00565F 21.154%, #007A88 50.954%, #7FC6D0 85.326%, #00565F",
            /* every radius token is zero: the components read these, so nothing
               in the interface can round a corner */
  "--dsw-radius-xs": "0px",
  "--dsw-radius-sm": "0px",
  "--dsw-radius-md": "0px",
  "--dsw-radius-lg": "0px",
  "--dsw-radius-xl": "0px",
  "--dsw-radius-panel": "0px",
            /* markdown */
            "--dsw-alias-markdown-code-block": "#C8C4BC",
            "--dsw-alias-markdown-code-block-banner": "#BFBBB2",
            "--dsw-alias-markdown-inline-code": "#C8C4BC",
            "--dsw-alias-markdown-citation": "#D8D4C4",
            "--dsw-alias-markdown-placeholder": "#808080",
            "--dsw-alias-markdown-tag": "#C8C4BC",
            "--dsw-alias-markdown-code-segment-selected": "#C8C4BC",
            "--dsw-alias-markdown-code-segment-unselected": "#BFBBB2",

            /* scrollbars — the silver 3D trough */
            "--dsw-alias-scrollbar-bg-l1": "#D4D0C8",
            "--dsw-alias-scrollbar-bg-l2": "#D4D0C8",
            "--dsw-alias-scrollbar-hover-l1": "#E4E1DC",
            "--dsw-alias-scrollbar-hover-l2": "#E4E1DC",

            /* settings cards */
            "--dsw-alias-settings-card-fill": "#D4D0C8",
            "--dsw-alias-settings-card-stroke": "#ACA899",

            /* status colours */
            "--dsw-alias-state-business-primary": "#0A246A",
            "--dsw-alias-state-business-tertiary": "#C1D2EE",
            "--dsw-alias-state-error-primary": "#CC0000",
            "--dsw-alias-state-error-secondary": "#CC0000",
            "--dsw-alias-state-idle-primary": "#ACA899",
            "--dsw-alias-state-success-primary": "#008000",
            "--dsw-alias-state-success-secondary": "#2E7D32",
            "--dsw-alias-state-success-tertiary": "#D6EFD6",
            "--dsw-alias-state-warn-label": "#7F6000",
            "--dsw-alias-state-warn-primary": "#A08000",
            "--dsw-alias-state-warn-secondary": "#C0A040",
            "--dsw-alias-state-warn-tertiary": "#FFF4CE",

            /* diffs */
            "--dsw-alias-code-diff-added": "#00800014",
            "--dsw-alias-code-diff-deleted": "#CC000014",
            "--dsw-alias-file-diff-added-bg": "#E6FFEC",
            "--dsw-alias-file-diff-added-gutter": "#DCFFE4",
            "--dsw-alias-file-diff-added-marker": "#008000",
            "--dsw-alias-file-diff-deleted-bg": "#FFEBE9",
            "--dsw-alias-file-diff-deleted-gutter": "#FFDCE0",
            "--dsw-alias-file-diff-deleted-marker": "#CC0000",

            /* onboarding */
            "--dsw-alias-onboarding-accent": "#0A246A",
            "--dsw-alias-onboarding-card-fill": "#D4D0C8",
            "--dsw-alias-onboarding-checkbox-border": "#ACA899",
            "--dsw-alias-onboarding-secondary-fill": "#D4D0C8",
        };

        /**
         * The XP Luna face: beige chrome, blue title-bar accents. Only the
         * values that differ from {@link WIN2003_TOKENS} — the variant rule is
         * emitted after the base one, so it wins per property.
         */
        const LUNA_TOKENS = {
            "--dsw-alias-bg-module-platform": "#D4D0C8",
            "--dsw-alias-bg-overlay": "#D4D0C8",
            "--dsw-alias-bg-skeleton": "#D8D4C4",
            "--dsw-alias-bg-multi-select": "#E4E1D5",
            "--dsw-alias-border-l1": "#C8C4B4",
            "--dsw-alias-border-l2": "#ACA899",
            "--dsw-alias-border-l2-darkmode-thin": "#ACA899",
            "--dsw-alias-border-l3": "#7F7F7F",
            "--dsw-alias-border-l4": "#404040",
            "--dsw-alias-brand-primary": "#003C74",
            "--dsw-alias-brand-text": "#003C74",
            "--dsw-alias-brand-primary-new-colorprimary-new-color": "#0A246A",
            "--dsw-alias-label-primary-bluish": "#003C74",
            "--dsw-alias-label-dimmed": "#808080",
            "--dsw-alias-button-primary-hover": "#003C74",
            "--dsw-alias-button-primary-dimmed": "#D4D0C8",
            "--dsw-alias-button-floating-fill": "#D4D0C8",
            "--dsw-alias-button-floating-hover": "#E3E0D2",
            "--dsw-alias-button-elevated-fill": "#D4D0C8",
            "--dsw-alias-button-tool-bar-fill": "#D4D0C8",
            "--dsw-alias-button-tool-bar-hover": "#E3E0D2",
            "--dsw-alias-button-contrast-fill": "#333333",
            "--dsw-alias-button-ghost-active-fill": "#C1D2EE",
            "--dsw-alias-button-ghost-active-border": "#0A246A",
            "--dsw-alias-button-ghost-active-hover": "#B4C9EA",
            "--dsw-alias-button-info-fill": "#0A246A",
            "--dsw-alias-button-info-hover": "#2456A8",
            "--dsw-alias-interactive-bg-hover": "#0A246A1a",
            "--dsw-alias-interactive-bg-active": "#0A246A26",
            "--dsw-alias-interactive-bg-hover-accent": "#0A246A33",
            "--dsw-alias-interactive-bg-hover-solid": "#E3E0D2",
            "--dsw-specific-sidebar-fill": "#D4D0C8",
            "--dsw-specific-sidebar-nav-item-active": "#0A246A",
            "--dsw-specific-sidebar-nav-item-active-accent": "#EDEDED",
            "--dsw-specific-sidebar-nav-item-hover": "#E3E0D2",
            "--dsw-alias-scrollbar-hover-l1": "#E3E0D2",
            "--dsw-alias-scrollbar-hover-l2": "#E3E0D2",
            "--dsw-alias-settings-card-stroke": "#ACA899",
            "--dsw-alias-state-business-primary": "#0A246A",
            "--dsw-alias-state-business-tertiary": "#C1D2EE",
            "--dsw-alias-state-idle-primary": "#ACA899",
            "--dsw-alias-markdown-code-block-banner": "#C8C4BC",
            "--dsw-alias-markdown-inline-code": "#C8C4BC",
            "--dsw-alias-markdown-citation": "#D8D4C4",
            "--dsw-alias-markdown-placeholder": "#ACA899",
            "--dsw-alias-markdown-tag": "#D8D4C4",
            "--dsw-alias-markdown-code-segment-unselected": "#C8C4BC",
            "--dsw-alias-onboarding-accent": "#0A246A",
            "--dsw-alias-onboarding-checkbox-border": "#ACA899",
            "--dsw-specific-bubble-highlight": "#DCE6F5",
        };

        /** Flatten a palette into declarations; `!important` defends it against
         *  the theme presenter's body inline tokens. */
        const declarations = (tokens) =>
            Object.entries(tokens)
                .map(([name, value]) => `${name}:${value} !important`)
                .join(";");

        /* Palettes are spliced into the sheet at apply time. `${...}` inside a
           module-level template literal is not evaluated by every client bundle
           pipeline, so the tokens are injected explicitly instead. */
        const TOKEN_SLOT = "@@TOKENS@@";
        const LUNA_SLOT = "@@LUNA@@";
        const buildStylesheet = () => STYLESHEET
            .split(TOKEN_SLOT).join(declarations(WIN2003_TOKENS))
            .split(LUNA_SLOT).join(declarations(LUNA_TOKENS));

        const STYLESHEET = `
body[data-dsh-skin="win2000"]{${TOKEN_SLOT}
  --dsh-skin-frame:4px;
  --dsh-skin-highlight:#EDEDED;
  --dsh-skin-sheen:#0A246A1a;
  --dsh-skin-titlebar-active:linear-gradient(90deg,#0A246A 0%,#A6CAF0 100%);
  --dsh-skin-titlebar-inactive:linear-gradient(90deg,#808080 0%,#C0C0C0 100%);
  --dsh-skin-shadow-raised:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080;
  --dsh-skin-shadow-sunken:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF;
  --dsh-skin-shadow-active:inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF;
  --dsw-corner-shape:round;
  font-size:11px;
  -webkit-font-smoothing:none;
}
body[data-dsh-skin="win2000"][data-dsh-skin-variant="luna"]{@@LUNA@@}
body[data-dsh-skin="win2000"] *::selection{background:#0A246A !important;color:#EDEDED !important}
body[data-dsh-skin="win2000"] :is(button,summary){box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080}
body[data-dsh-skin="win2000"] :is(button,summary):hover{box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080,inset 0 0 0 100px var(--dsh-skin-sheen)}
body[data-dsh-skin="win2000"] :is(button,summary):active,body[data-dsh-skin="win2000"] button[aria-pressed="true"]{box-shadow:inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF,inset 0 0 0 100px var(--dsh-skin-sheen)}
body[data-dsh-skin="win2000"] :is(button,summary):focus-visible{outline:1px dotted #000;outline-offset:-4px}
body[data-dsh-skin="win2000"] :is(input,textarea,select,[role="textbox"],[contenteditable="true"]){box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF;background:#F4F4F4 !important;color:#000000 !important}
body[data-dsh-skin="win2000"] :is(input,textarea,select,[role="textbox"],[contenteditable="true"]):focus{outline:none}
body[data-dsh-skin="win2000"] :is([role="dialog"],[role="alertdialog"]){box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080}
body[data-dsh-skin="win2000"] :is(pre,table,fieldset){box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF}
body[data-dsh-skin="win2000"] :is(input,textarea,select,button,summary,pre,code,blockquote,table,th,td,fieldset,legend,[role="button"],[role="tab"],[role="dialog"],[role="menu"],[role="listbox"],[role="textbox"],[contenteditable="true"],[data-dsh-skin-panel],[data-dsh-skin-panel] *,[data-dsh-skin-window],[data-dsh-skin-window] *,[class*="Badge"],[class*="badge"]){border-radius:0 !important}
body[data-dsh-skin="win2000"] :is([role="button"],[role="tab"],[role="option"],[role="menuitem"]):not([aria-pressed="true"]):not([aria-selected="true"]):not([class*="_selected"]){background:#D4D0C8 !important}
body[data-dsh-skin="win2000"] :is([aria-selected="true"],[data-selected="true"],[class*="_selected"]){background-color:#0A246A !important;color:#EDEDED !important}
body[data-dsh-skin="win2000"] :is([aria-selected="true"],[data-selected="true"],[class*="_selected"]) :is(span,div,p,a,time){color:#EDEDED !important}
body[data-dsh-skin="win2000"] :is([aria-selected="true"],[data-selected="true"],[class*="_selected"]) svg{color:#EDEDED !important}
body[data-dsh-skin="win2000"] input[type="checkbox"],[data-dsh-skin-window] [data-dsh-skin-check] input{width:13px;height:13px;margin:0;appearance:none;-webkit-appearance:none;background:#F4F4F4 !important;box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF !important}
body[data-dsh-skin="win2000"] input[type="checkbox"]:checked,[data-dsh-skin-window] [data-dsh-skin-check] input:checked{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='%23000'/%3E%3C/svg%3E") !important;background-position:center !important;background-repeat:no-repeat !important}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar{width:16px;height:16px}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar-track{background:#D4D0C8;background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='2' height='2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M1 0H0v1h1v1h1V1H1V0z' fill='%23D4D0C8'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2 0H1v1H0v1h1V1h1V0z' fill='%23F5F5F5'/%3E%3C/svg%3E");box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar-thumb{background:#D4D0C8;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar-thumb:hover{background:#E3E0D2}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar-thumb:active{background:#C8C4B4;box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar-corner{background:#D4D0C8}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar-button{display:block;background-color:#D4D0C8;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar-button:vertical:start{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8 5H7v1H6v1H5v1H4v1h8V9h-1V8h-1V7H9V6H8V5z' fill='%23000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar-button:vertical:end{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M11 6H4v1h1v1h1v1h1v1h1V9h1V8h1V7h1V6z' fill='%23000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}
body[data-dsh-skin="win2000"] *::-webkit-scrollbar,body[data-dsh-skin="win2000"] *::-webkit-scrollbar-thumb,body[data-dsh-skin="win2000"] *::-webkit-scrollbar-track,body[data-dsh-skin="win2000"] *::-webkit-scrollbar-button,body[data-dsh-skin="win2000"] *::-webkit-scrollbar-corner{border-radius:0 !important}
[data-dsh-skin-panel]{position:fixed;right:12px;bottom:12px;z-index:30;display:flex;flex-direction:column;gap:3px;align-items:stretch;color:#000 !important;background:#D4D0C8 !important;border:0 !important;border-radius:0 !important;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080 !important;padding:4px;min-width:148px;font-family:inherit;font-size:11px}
[data-dsh-skin-panel] > button{display:flex;align-items:center;gap:6px;padding:5px 10px;text-align:left;font-family:inherit;font-size:11px;color:inherit;background:#D4D0C8 !important;border:0 !important;border-radius:0 !important;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080 !important;cursor:pointer}
[data-dsh-skin-panel] > button:hover{box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080,inset 0 0 0 100px #0A246A1a}
[data-dsh-skin-panel] > button:active,[data-dsh-skin-panel] > button[aria-pressed="true"]{background:#0A246A !important;color:#EDEDED !important;box-shadow:inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF !important}
[data-dsh-skin-panel] > button[aria-pressed="true"] *{color:#EDEDED !important}
[data-dsh-skin-panel] > button[disabled]{color:#808080;background:#D4D0C8 !important;cursor:default}
[data-dsh-skin-panel] > button span[data-dsh-skin-mark]{flex:none;width:11px;height:11px;background:#F4F4F4;box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF !important;display:inline-flex;align-items:center;justify-content:center}
[data-dsh-skin-panel] > button[aria-pressed="true"] span[data-dsh-skin-mark]:not([style*="background"]){background-color:#F4F4F4 !important;background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='%23000'/%3E%3C/svg%3E") !important;background-position:center !important;background-repeat:no-repeat !important}
/* The bitmap face ships inside this package and is served by the host from it,
   so every installation renders identically instead of depending on locally
   installed fonts. */
@font-face{font-family:"unsciiCJKV18";src:url("/api/dsh-skin-win2000/fonts/unsciiCJKV18.otf") format("opentype"),local("unsciiCJKV18");font-display:swap}
body[data-dsh-skin="win2000"][data-dsh-skin-pixel],body[data-dsh-skin="win2000"][data-dsh-skin-pixel] :is(button,input,select,textarea,pre,code,div,span,p,a,label,h1,h2,h3,h4,table,th,td){font-family:"unsciiCJKV18",monospace !important;font-size:16px !important;line-height:1.25 !important;font-weight:normal !important;font-synthesis:none !important;-webkit-font-smoothing:none !important;text-rendering:optimizeSpeed !important}
/* The face ships a single weight, so a request for bold (or italic) makes the
   browser synthesise an outline stroke — on a pixel grid that smears the glyph
   into grey. The font-synthesis:none above is inherited, so no descendant can
   trigger it; emphasis is instead drawn the way pixel type does it, by
   overprinting the glyph one pixel to the right. Sharper than synthetic bold,
   and it keeps <strong> visibly heavier than body text. */
body[data-dsh-skin="win2000"][data-dsh-skin-pixel] :is(strong,b){text-shadow:1px 0 0 currentColor !important}
[data-dsh-skin-panel] hr{margin:3px 6px;border:0;border-top:1px solid #808080;border-bottom:1px solid #EDEDED}
[data-dsh-skin-panel] [data-dsh-skin-title]{padding:3px 10px;color:#000}
[data-dsh-skin-panelbar]{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:3px 3px 3px 7px;margin:0 0 3px;background:linear-gradient(90deg,#0A246A 0%,#A6CAF0 100%);cursor:move;touch-action:none;user-select:none}
[data-dsh-skin-panel][data-dsh-skin-folded] [data-dsh-skin-panelbar]{margin:0}
[data-dsh-skin-paneltitle]{color:#EDEDED;font-weight:bold;font-size:11px}
[data-dsh-skin-panelbar] [data-dsh-skin-fold]{width:18px;height:16px;padding:0;display:flex;align-items:center;justify-content:center;color:#000;background:#D4D0C8;border:0;border-radius:0;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080;font-size:10px;line-height:1;cursor:pointer}
[data-dsh-skin-panelbar] [data-dsh-skin-fold]:active{box-shadow:inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF}
[data-dsh-skin-window]{position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:31;width:420px;color:#000;background:#D4D0C8;border:0;border-radius:0;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080;font-family:inherit;font-size:11px}
[data-dsh-skin-window] [data-dsh-skin-titlebar]{display:flex;align-items:center;gap:4px;height:22px;margin:4px 4px 0;padding:0 2px 0 5px;background:linear-gradient(90deg,#0A246A 0%,#A6CAF0 100%)}
[data-dsh-skin-window][data-dsh-skin-inactive="true"] [data-dsh-skin-titlebar]{background:linear-gradient(90deg,#808080 0%,#C0C0C0 100%)}
[data-dsh-skin-window] [data-dsh-skin-titletext]{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#EDEDED;font-weight:bold;font-size:11px}
[data-dsh-skin-window] [data-dsh-skin-titlebtn]{flex:none;width:16px;height:14px;padding:0;display:flex;align-items:center;justify-content:center;color:transparent !important;background-color:#D4D0C8 !important;background-repeat:no-repeat !important;border:0 !important;border-radius:0 !important;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080 !important;font-size:0 !important;line-height:0 !important;cursor:pointer}
[data-dsh-skin-window] [data-dsh-skin-titlebtn][aria-label="最小化"],[data-dsh-skin-window] [data-dsh-skin-titlebtn="min"]{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='6' height='2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000' d='M0 0h6v2H0z'/%3E%3C/svg%3E") !important;background-position:bottom 3px left 4px !important}
[data-dsh-skin-window] [data-dsh-skin-titlebtn][aria-label="最大化"],[data-dsh-skin-window] [data-dsh-skin-titlebtn="max"]{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='9' height='9' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M9 0H0v9h9V0zM8 2H1v6h7V2z' fill='%23000'/%3E%3C/svg%3E") !important;background-position:top 2px left 3px !important}
[data-dsh-skin-window] [data-dsh-skin-titlebtn][aria-label="关闭"],[data-dsh-skin-window] [data-dsh-skin-titlebtn="close"]{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg width='8' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M0 0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H5v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1V5h1V4h1V3H2V2H1V1H0V0z' fill='%23000'/%3E%3C/svg%3E") !important;background-position:top 3px left 4px !important}
[data-dsh-skin-window] [data-dsh-skin-titlebtn]:active,[data-dsh-skin-window] [data-dsh-skin-titlebtn][aria-pressed="true"]{box-shadow:inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF !important}
[data-dsh-skin-window] [data-dsh-skin-menubar]{display:flex;gap:1px;margin:4px;padding:1px}
[data-dsh-skin-window] [data-dsh-skin-menubar] button{padding:2px 7px;color:#000;background:transparent;border:0;border-radius:0;font-family:inherit;font-size:11px;cursor:pointer}
[data-dsh-skin-window] [data-dsh-skin-menubar] button:hover,[data-dsh-skin-window] [data-dsh-skin-menubar] button[aria-expanded="true"]{color:#EDEDED;background:#0A246A}
[data-dsh-skin-window] [data-dsh-skin-menu]{position:absolute;left:14px;top:50px;z-index:1;min-width:132px;display:flex;flex-direction:column;background:#D4D0C8;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080;padding:2px}
[data-dsh-skin-window] [data-dsh-skin-menu] button{padding:3px 18px 3px 8px;text-align:left;color:#000;background:transparent;border:0;border-radius:0;font-family:inherit;font-size:11px;cursor:pointer}
[data-dsh-skin-window] [data-dsh-skin-menu] button:hover{color:#EDEDED;background:#0A246A}
[data-dsh-skin-window] [data-dsh-skin-client]{margin:4px;padding:12px 14px;color:#000;background:#D4D0C8;box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF}
[data-dsh-skin-window] [data-dsh-skin-row]{display:flex;align-items:center;gap:8px;margin:0 0 9px}
[data-dsh-skin-window] [data-dsh-skin-row]:last-child{margin-bottom:0}
[data-dsh-skin-window] [data-dsh-skin-label]{flex:none;width:76px}
[data-dsh-skin-window] [data-dsh-skin-input]{flex:1;min-width:0;height:20px;padding:2px 4px;color:#000;background:#F4F4F4;border:0;border-radius:0;box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF;font-family:inherit;font-size:11px}
[data-dsh-skin-window] [data-dsh-skin-check]{display:flex;align-items:center;gap:5px;color:#000;cursor:pointer}
[data-dsh-skin-window] [data-dsh-skin-status]{display:flex;gap:2px;align-items:stretch;margin:0 4px 4px}
[data-dsh-skin-window] [data-dsh-skin-status] span{flex:1;min-width:0;padding:2px 6px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;box-shadow:inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF}
[data-dsh-skin-window] [data-dsh-skin-actions]{display:flex;justify-content:flex-end;gap:8px;margin:0 4px 4px;padding:10px 4px 12px}
[data-dsh-skin-window] [data-dsh-skin-actions] button{min-width:78px;padding:5px 12px;color:#000;background:#D4D0C8;border:0;border-radius:0;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080;font-family:inherit;font-size:11px;cursor:pointer}
[data-dsh-skin-window] [data-dsh-skin-actions] button:active{box-shadow:inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF}
[data-dsh-skin-window] [data-dsh-skin-actions] button:focus-visible{outline:1px dotted #000;outline-offset:-4px}
[data-dsh-skin-panel] *,[data-dsh-skin-window] *{border-radius:0 !important}
body[data-dsh-skin="win2000"] :is(input,textarea,select,button,summary,th,td,legend,[role="button"],[role="tab"],[role="option"],[role="textbox"],[contenteditable="true"],[data-dsh-skin-label],[data-dsh-skin-status] span,[data-dsh-skin-input]){padding-inline-start:6px;padding-inline-end:6px;padding-block-start:3px;padding-block-end:3px}
body[data-dsh-skin="win2000"] pre{padding:10px 12px !important;line-height:1.45 !important}
body[data-dsh-skin="win2000"] code:not(pre code){padding:1px 4px !important}
body[data-dsh-skin="win2000"] blockquote{padding:4px 12px !important;border-left:2px solid #808080 !important;margin:8px 0 !important}
/* Tooltip bubbles read their text colour from the static ramp's brightest step
   (--dsw-static-neutral-bluish-00), which this skin keeps light on purpose; the
   bubble is the one surface that needs dark text, so it is named here. */
body[data-dsh-skin="win2000"] [class*="bubble"]{color:#000 !important;background:#FFFFE1 !important;border-radius:0 !important}
/* Tool and command cards, popover cards, and hover cards: text must be black on light grey background */
body[data-dsh-skin="win2000"] :is([class*="_card"],[class*="hoverContent"],[class*="hoverTitle"],[class*="hoverTime"],[class*="hoverStatus"],[class*="popup"],[class*="Popover"],[role="tooltip"]){color:#000000 !important;border-radius:0 !important}
body[data-dsh-skin="win2000"] :is([class*="_card"],[class*="hoverContent"],[class*="popup"],[class*="Popover"],[role="tooltip"]) :is(div,span,p,a,time,label,h1,h2,h3,h4){color:#000000 !important}
body[data-dsh-skin="win2000"] [class*="_card"]{background:#D4D0C8 !important;color:#000000 !important;border-radius:0 !important;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080 !important}
body[data-dsh-skin="win2000"] :is([class*="_card"],[class*="Card"]){--changes-fill:#D4D0C8 !important;--changes-hover:#C8C4BC !important}
/* Sidebar session icon buttons: keep clean, centered, and visible icons */
/* Stop-generating shares the composer's primary button class with Send; only its
   accessible label tells them apart, so the red is keyed on the label. */
body[data-dsh-skin="win2000"] button[aria-label="停止生成"],body[data-dsh-skin="win2000"] button[aria-label="Stop generating"]{background:#CC0000 !important;color:#EDEDED !important;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080 !important}
body[data-dsh-skin="win2000"] button[aria-label="停止生成"]:hover,body[data-dsh-skin="win2000"] button[aria-label="Stop generating"]:hover{background:#E00000 !important}
body[data-dsh-skin="win2000"] button[aria-label="停止生成"]:active,body[data-dsh-skin="win2000"] button[aria-label="Stop generating"]:active{background:#A80000 !important;box-shadow:inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF !important}
body[data-dsh-skin="win2000"] button[aria-label="停止生成"] svg,body[data-dsh-skin="win2000"] button[aria-label="Stop generating"] svg{color:#EDEDED !important}
/* Icon buttons: compact raised squares, restored after the last round. */
body[data-dsh-skin="win2000"] [class*="iconButton"],body[data-dsh-skin="win2000"] [class*="IconButton"]{padding:0 !important;min-width:18px !important;min-height:18px !important;width:18px !important;height:18px !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;background:#D4D0C8 !important;box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080 !important}
body[data-dsh-skin="win2000"] [class*="iconButton"]:hover,body[data-dsh-skin="win2000"] [class*="IconButton"]:hover{box-shadow:inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080,inset 0 0 0 100px #0A246A1a !important}
body[data-dsh-skin="win2000"] [class*="iconButton"]:active,body[data-dsh-skin="win2000"] [class*="IconButton"]:active{box-shadow:inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF !important}
body[data-dsh-skin="win2000"] [class*="iconButton"] svg,body[data-dsh-skin="win2000"] [class*="IconButton"] svg{width:12px;height:12px;color:#000000}
`;


        /** Remembered choices, all optional: no entry means the skin on, CJKV18 face on. */
        const readSettings = () => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const parsed = raw === null ? {} : JSON.parse(raw);
                return {
                    enabled: parsed.enabled !== false,
                    variant: "luna",
                    pixel: parsed.pixel !== false,
                };
            } catch {
                return { enabled: true, variant: "luna", pixel: true };
            }
        };

        const writeSettings = (settings) => {
            try {
                if (settings.enabled && settings.pixel) localStorage.removeItem(STORAGE_KEY);
                else localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            } catch {
                /* Storage unavailable (private mode): the choices still hold for this page. */
            }
        };

        /**
         * Project the settings onto the document: one attribute gates the whole
         * stylesheet, a second turns the CJKV18 face on. The skin is applied
         * straight to the document rather than through a registered theme, so no
         * stock palette is ever modified.
         * @param settings - the remembered choices.
         */
        function project(settings) {
            const body = document.body;
            if (settings.enabled) {
                body.setAttribute(SKIN_ATTRIBUTE, SKIN_VALUE);
                body.setAttribute("data-dsh-skin-variant", "luna");
                if (settings.pixel) {
                    body.setAttribute("data-dsh-skin-pixel", PIXEL_VALUE);
                } else {
                    body.removeAttribute("data-dsh-skin-pixel");
                }
            } else {
                body.removeAttribute(SKIN_ATTRIBUTE);
                body.removeAttribute("data-dsh-skin-variant");
                body.removeAttribute("data-dsh-skin-pixel");
            }
            document.documentElement.style.colorScheme = settings.enabled ? "light" : "";
            writeSettings(settings);
        }

        /** One palette only: Windows 2003 Luna. A second accent set is what made
         *  the interface carry colours the Windows 2003 scheme does not own. */
        const PALETTES = [
            { id: "luna", label: "Windows 2003", mark: "#0A246A" },
        ];

        /** The demo window's menu bar. Each menu opens a navy dropdown. */
        const MENUS = [
            { id: "file", label: "文件", items: ["新建", "打开...", "保存", "退出"] },
            { id: "edit", label: "编辑", items: ["撤销", "剪切", "复制", "粘贴"] },
            { id: "view", label: "查看", items: ["工具栏", "状态栏", "刷新"] },
            { id: "help", label: "帮助", items: ["帮助主题", "关于 Windows 2000"] },
        ];

        /**
         * The pixel specification this skin implements, in one place: the two
         * bevels, the pressed state, the title-bar gradients and the type.
         * Exported so the bundle's check asserts the numbers the design calls
         * for instead of whatever the stylesheet happens to contain.
         */
        const SPEC = {
            surface: "#D4D0C8",
            titlebarActive: "linear-gradient(90deg,#0A246A 0%,#A6CAF0 100%)",
            titlebarInactive: "linear-gradient(90deg,#808080 0%,#C0C0C0 100%)",
            outset: "inset 1px 1px 0 #F5F5F5,inset -1px -1px 0 #000000,inset 2px 2px 0 #DFDFDF,inset -2px -2px 0 #808080",
            inset: "inset 1px 1px 0 #808080,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #000000,inset -2px -2px 0 #DFDFDF",
            active: "inset 1px 1px 0 #000000,inset -1px -1px 0 #F5F5F5,inset 2px 2px 0 #808080,inset -2px -2px 0 #DFDFDF",
            fontSize: "11px",
            smoothing: "none",
            textShadow: "#404040",
            highlight: "#F5F5F5",
        };

        /**
         * The classic modal window: title bar with the three title buttons, menu
         * bar, a sunken client area with two fields and a checkbox, a sunken
         * status bar, and the right-aligned action row. Nothing here reaches
         * into the Host's own dialogs — it is the skin's own specimen, so the
         * specification can be seen on the page instead of only in the CSS.
         *
         * Purely visual states (the active and inactive title bars, the pressed
         * minimize/maximize buttons) are driven by clicks, because a specimen
         * that cannot be focused has no real activation to follow.
         */
        function ClassicWindow() {
            const [openMenu, setOpenMenu] = React.useState(null);
            const [inactive, setInactive] = React.useState(false);
            const [pressed, setPressed] = React.useState("");
            const [checked, setChecked] = React.useState(true);
            const [name, setName] = React.useState("DSH 皮肤示例");

            const titleButton = (id, glyph, label, onClick) => React.createElement("button", {
                key: id,
                type: "button",
                "data-dsh-skin-titlebtn": id,
                "aria-label": label,
                "aria-pressed": pressed === id ? "true" : "false",
                onClick,
            }, glyph);

            const menuBar = React.createElement("div", { "data-dsh-skin-menubar": "" },
                ...MENUS.map((menu) => React.createElement("button", {
                    key: menu.id,
                    type: "button",
                    "aria-haspopup": "true",
                    "aria-expanded": openMenu === menu.id ? "true" : "false",
                    onClick: () => { setOpenMenu(openMenu === menu.id ? null : menu.id); },
                }, menu.label)));

            const client = React.createElement("div", { "data-dsh-skin-client": "" },
                React.createElement("div", { "data-dsh-skin-row": "" },
                    React.createElement("span", { "data-dsh-skin-label": "" }, "名称(&N):"),
                    React.createElement("input", {
                        "data-dsh-skin-input": "",
                        value: name,
                        onChange: (event) => { setName(event.target.value); },
                    })),
                React.createElement("div", { "data-dsh-skin-row": "" },
                    React.createElement("span", { "data-dsh-skin-label": "" }, "位置(&L):"),
                    React.createElement("input", { "data-dsh-skin-input": "", defaultValue: "C:\\WINNT\\System32" })),
                React.createElement("div", { "data-dsh-skin-row": "" },
                    React.createElement("label", { "data-dsh-skin-check": "" },
                        React.createElement("input", {
                            type: "checkbox",
                            checked,
                            onChange: () => { setChecked(!checked); },
                        }), "记住此设置")),
                openMenu === null ? null : React.createElement("div", { "data-dsh-skin-menu": "" },
                    ...(MENUS.find((menu) => menu.id === openMenu)?.items ?? []).map((item) => React.createElement("button", {
                        key: item,
                        type: "button",
                        onClick: () => { setOpenMenu(null); },
                    }, item))));

            return React.createElement("div", {
                "data-dsh-skin-window": "",
                "data-dsh-skin-inactive": inactive ? "true" : "false",
                role: "dialog",
                "aria-label": "Windows 2000 窗口示例",
            },
            React.createElement("div", { "data-dsh-skin-titlebar": "" },
                React.createElement("span", { "data-dsh-skin-titletext": "" }, "示例对话框"),
                titleButton("min", "\u2013", "最小化", () => { setPressed(pressed === "min" ? "" : "min"); }),
                titleButton("max", "\u25A1", "最大化", () => { setPressed(pressed === "max" ? "" : "max"); }),
                titleButton("close", "\u00D7", "关闭", () => { setPressed(""); setInactive(true); })),
            menuBar,
            client,
            React.createElement("div", { "data-dsh-skin-status": "" },
                React.createElement("span", "", "就绪"),
                React.createElement("span", "", `对象: ${String(MENUS.length)} 个菜单`),
                React.createElement("span", "", "Windows 2003 配色")),
            React.createElement("div", { "data-dsh-skin-actions": "" },
                React.createElement("button", { type: "button", onClick: () => { setInactive(false); } }, "激活(&A)"),
                React.createElement("button", { type: "button" }, "确定"),
                React.createElement("button", { type: "button" }, "取消")));
        }

        /** Panel chrome state: where the user dragged it, and whether it is folded. */
        const UI_KEY = "dsh.skin.win2000.ui";
        const readUi = () => {
            try {
                const parsed = JSON.parse(localStorage.getItem(UI_KEY) ?? "{}");
                return {
                    x: Number.isFinite(parsed.x) ? parsed.x : null,
                    y: Number.isFinite(parsed.y) ? parsed.y : null,
                    folded: parsed.folded === true,
                };
            } catch {
                return { x: null, y: null, folded: false };
            }
        };
        const writeUi = (ui) => {
            try {
                localStorage.setItem(UI_KEY, JSON.stringify(ui));
            } catch {
                /* private mode: the panel still moves, it just forgets */
            }
        };

        /**
         * The corner settings panel: a title bar that drags and folds, the skin
         * switch, the pixel-font switch and the window specimen. It lives in the
         * shell overlay, which is click-through, so the panel never blocks the
         * app underneath.
         */
        function SkinSettings() {
            const [settings, setSettings] = React.useState(readSettings);
            const [ui, setUi] = React.useState(readUi);
            const [specimen, setSpecimen] = React.useState(false);
            const drag = React.useRef(null);

            const update = (patch) => {
                const next = { ...settings, ...patch };
                setSettings(next);
                project(next);
            };
            const chrome = (patch) => {
                const next = { ...ui, ...patch };
                setUi(next);
                writeUi(next);
            };

            // Drag from anywhere on the title bar; pointer capture keeps the
            // gesture alive when the cursor leaves the small strip.
            const onPointerDown = (event) => {
                if (event.target.closest("[data-dsh-skin-fold]") !== null) return;
                const panel = event.currentTarget.parentElement;
                const rect = panel.getBoundingClientRect();
                drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
                event.currentTarget.setPointerCapture(event.pointerId);
            };
            const onPointerMove = (event) => {
                if (drag.current === null) return;
                const x = Math.min(Math.max(0, event.clientX - drag.current.dx), window.innerWidth - 80);
                const y = Math.min(Math.max(0, event.clientY - drag.current.dy), window.innerHeight - 40);
                setUi((current) => ({ ...current, x, y }));
            };
            const onPointerUp = (event) => {
                if (drag.current === null) return;
                drag.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
                const panel = event.currentTarget.parentElement;
                const rect = panel.getBoundingClientRect();
                chrome({ x: rect.left, y: rect.top });
            };

            // Viewport clamping: ensures panel never falls off the screen when expanded or moved
            const panelHeight = ui.folded ? 24 : 240;
            const panelWidth = 160;
            let safeX = ui.x;
            let safeY = ui.y;
            if (safeX !== null) safeX = Math.max(8, Math.min(safeX, (typeof window !== "undefined" ? window.innerWidth : 1200) - panelWidth - 8));
            if (safeY !== null) safeY = Math.max(8, Math.min(safeY, (typeof window !== "undefined" ? window.innerHeight : 800) - panelHeight - 8));
            const style = safeX === null || safeY === null ? undefined : { left: safeX + "px", top: safeY + "px", right: "auto", bottom: "auto" };

            const titleBar = React.createElement("div", {
                "data-dsh-skin-panelbar": "",
                onPointerDown,
                onPointerMove,
                onPointerUp,
                onPointerCancel: onPointerUp,
                onDoubleClick: () => { chrome({ x: null, y: null }); },
                title: "拖动位置，双击重置回右下角",
            },
            React.createElement("span", { "data-dsh-skin-paneltitle": "" }, "Windows 皮肤"),
            React.createElement("button", {
                type: "button",
                "data-dsh-skin-fold": "",
                "aria-expanded": ui.folded ? "false" : "true",
                title: ui.folded ? "展开设置" : "收起设置",
                onClick: () => {
                    const nextFolded = !ui.folded;
                    let nextY = ui.y;
                    if (!nextFolded && ui.y !== null && typeof window !== "undefined") {
                        nextY = Math.max(8, Math.min(ui.y, window.innerHeight - 250));
                    }
                    chrome({ folded: nextFolded, y: nextY });
                },
            }, ui.folded ? "+" : "\u2013"));

            if (ui.folded) {
                return React.createElement("div", { "data-dsh-skin-panel": "", "data-dsh-skin-folded": "", style }, titleBar);
            }

            const rows = [
                React.createElement("button", {
                    key: "enabled",
                    type: "button",
                    "aria-pressed": settings.enabled ? "true" : "false",
                    onClick: () => { update({ enabled: !settings.enabled }); },
                }, React.createElement("span", { "data-dsh-skin-mark": "" }), "启用皮肤"),
                React.createElement("button", {
                    key: "pixel",
                    type: "button",
                    disabled: !settings.enabled,
                    "aria-pressed": settings.enabled && settings.pixel ? "true" : "false",
                    onClick: () => { update({ pixel: !settings.pixel }); },
                }, React.createElement("span", { "data-dsh-skin-mark": "" }), "点阵字体"),
                React.createElement("hr", { key: "rule" }),
                React.createElement("button", {
                    key: "specimen",
                    type: "button",
                    disabled: !settings.enabled,
                    "aria-pressed": specimen ? "true" : "false",
                    onClick: () => { setSpecimen(!specimen); },
                }, React.createElement("span", { "data-dsh-skin-mark": "" }), "窗口示例"),
            ];
            return React.createElement("div", { "data-dsh-skin-panel": "", style },
                titleBar,
                ...rows,
                specimen ? React.createElement(ClassicWindow, { key: "window" }) : null);
        }

        /** Required client services. Without this the fiber starts before the
         *  slot registry exists and `ctx.slots` is undefined at apply time. */
        const inject = ["slots"];

        /**
         * Mount the stylesheet, apply the remembered choices, and register the
         * settings panel. Everything is owned by the plugin fiber, so unloading
         * the bundle restores the stock look.
         * @param ctx - client cordis context.
         */
        function apply(ctx) {
            ctx.effect(() => {
                const tag = document.createElement("style");
                tag.dataset.dshSkin = SKIN_VALUE;
                tag.textContent = buildStylesheet();
                document.head.append(tag);
                project(readSettings());
                return () => {
                    tag.remove();
                    project({ enabled: false, variant: "luna", pixel: false });
                    try {
                        localStorage.removeItem(STORAGE_KEY);
                    } catch {
                        /* nothing to release when storage is unavailable */
                    }
                };
            }, "dsh-skin-win2000: stylesheet and settings");
            ctx.slots.inject("shell.overlay", () => ctx.slots.register({
                name: "shell.overlay",
                id: "dsh-skin-win2000-settings",
                label: () => "Windows 皮肤设置",
            }, SkinSettings));
        }

        exports.inject = inject;
        exports.apply = apply;
        /** Exported for the bundle's own check; the host plugin row only reads `apply`. */
        exports.SkinSettings = SkinSettings;
        exports.ClassicWindow = ClassicWindow;
        exports.SPEC = SPEC;
        return module.exports;
    },
});




