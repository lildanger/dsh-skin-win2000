// Render the README screenshots as SVG, then rasterise with sharp.
// Every colour here is the value the skin actually ships (see verify-metrics.mjs).
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("file:///D:/Desktop/fuck/DSH/dsh-skin-win2003/");
const sharp = require("C:/Users/dange/.dsh/profiles/node_modules/sharp");

const FONT = 'Tahoma,"Microsoft YaHei",sans-serif';
const RAISED = "inset 1px 1px 0 #F5F5F5, inset -1px -1px 0 #000000, inset 2px 2px 0 #DFDFDF, inset -2px -2px 0 #808080";
const SUNKEN = "inset 1px 1px 0 #808080, inset -1px -1px 0 #F5F5F5, inset 2px 2px 0 #000000, inset -2px -2px 0 #DFDFDF";
const TITLE_ACTIVE = "linear-gradient(90deg,#0A246A 0%,#A6CAF0 100%)";
const TITLE_INACTIVE = "linear-gradient(90deg,#808080 0%,#C0C0C0 100%)";

const defs = (extra = "") => `
<defs>
  <linearGradient id="titleActive" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#0A246A"/><stop offset="100%" stop-color="#A6CAF0"/>
  </linearGradient>
  <linearGradient id="titleInactive" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#808080"/><stop offset="100%" stop-color="#C0C0C0"/>
  </linearGradient>
  ${extra}
</defs>`;

const frame = (body, width, height) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family='${FONT}'>
${defs()}
<rect width="${width}" height="${height}" fill="#D4D0C8"/>
${body}</svg>`;

const titleButton = (x, y, glyph) =>
    `<rect x="${x}" y="${y}" width="16" height="14" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>` +
    `<path d="M${x + 1} ${y + 1} h14" stroke="#F5F5F5" stroke-width="1"/>` +
    `<text x="${x + 8}" y="${y + 11}" font-size="10" fill="#000" text-anchor="middle">${glyph}</text>`;

/* ---------------------------------------------------------------- shot 1 -- */
const shot1 = frame(`
  <!-- left sidebar -->
  <rect x="0" y="0" width="268" height="620" fill="#D4D0C8"/>
  <rect x="14" y="16" width="240" height="30" fill="#D4D0C8" style="filter:none"/>
  <rect x="14" y="16" width="240" height="30" fill="none" stroke="#404040" stroke-width="1"/>
  <path d="M15 17 h238" stroke="#F5F5F5"/><path d="M15 18 h238" stroke="#DFDFDF"/>
  <text x="28" y="36" font-size="13" font-weight="bold" fill="#0A246A">deepseek</text>
  <text x="104" y="36" font-size="13" fill="#000">HARNESS</text>

  <rect x="14" y="54" width="240" height="28" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M15 55 h238" stroke="#F5F5F5"/><path d="M15 56 h238" stroke="#DFDFDF"/>
  <text x="80" y="73" font-size="12" fill="#000">＋　新会话</text>

  <rect x="14" y="88" width="240" height="28" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M15 89 h238" stroke="#F5F5F5"/><path d="M15 90 h238" stroke="#DFDFDF"/>
  <text x="34" y="107" font-size="12" fill="#000">插件</text>

  <rect x="14" y="122" width="240" height="28" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M15 123 h238" stroke="#F5F5F5"/><path d="M15 124 h238" stroke="#DFDFDF"/>
  <text x="34" y="141" font-size="12" fill="#000">扩展管理</text>

  <text x="18" y="176" font-size="12" fill="#555555">工作区</text>
  <text x="26" y="200" font-size="12" fill="#000">yami-tools 游戏工具开发</text>
  <rect x="14" y="212" width="240" height="28" fill="#0A246A"/>
  <text x="26" y="231" font-size="12" fill="#F5F5F5">Windows 2003 Server 皮肤…</text>
  <text x="212" y="231" font-size="12" fill="#F5F5F5">1 分钟</text>
  <text x="26" y="259" font-size="12" fill="#000">Bandicam 视频转 H.264 编码</text>
  <text x="216" y="259" font-size="12" fill="#555555">35 分钟</text>
  <text x="26" y="287" font-size="12" fill="#000">为字体添加 Nerd Font 图标</text>
  <text x="226" y="287" font-size="12" fill="#555555">1 天</text>
  <text x="26" y="315" font-size="12" fill="#000">DeepSeek 4.1 Flash 提示词</text>
  <text x="226" y="315" font-size="12" fill="#555555">3 天</text>
  <rect x="14" y="334" width="240" height="26" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M15 335 h238" stroke="#F5F5F5"/>
  <text x="26" y="352" font-size="12" fill="#000">展开其余 6 个会话</text>

  <!-- main column -->
  <rect x="268" y="0" width="932" height="620" fill="#D4D0C8"/>
  <path d="M268 0 v620" stroke="#7F7F7F"/>
  <text x="292" y="30" font-size="14" fill="#000">Windows 2003 Server 皮肤制作</text>

  <!-- message card, raised -->
  <rect x="292" y="52" width="884" height="150" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M293 53 h882" stroke="#F5F5F5"/><path d="M293 54 h882" stroke="#DFDFDF"/>
  <path d="M293 201 h882" stroke="#808080"/><path d="M294 202 h880" stroke="#DFDFDF"/>
  <text x="308" y="78" font-size="12" font-weight="bold" fill="#000">皮肤已启用</text>
  <text x="308" y="100" font-size="12" fill="#000">整帧统一到 Windows Server 2003 度量表：控件表面 #D4D0C8、标题栏双向渐变、直角、1px 立体浮雕。</text>
  <text x="308" y="120" font-size="12" fill="#000">滚动条 16px 直角，代码块沉到 #C8C4BC，界面不出现纯白。</text>

  <!-- code block, sunken -->
  <rect x="308" y="132" width="852" height="56" fill="#C8C4BC" stroke="#808080" stroke-width="1"/>
  <path d="M309 133 h850" stroke="#F5F5F5"/>
  <text x="322" y="152" font-size="12" fill="#003C74">--dsw-alias-bg-base: #D4D0C8</text>
  <text x="322" y="172" font-size="12" fill="#006400">/* radius tokens are all zero */</text>

  <!-- composer -->
  <rect x="292" y="520" width="884" height="60" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M293 521 h882" stroke="#F5F5F5"/><path d="M293 522 h882" stroke="#000000"/>
  <text x="310" y="546" font-size="12" fill="#555555">发消息或创建任务, / 调用指令, @ 文件或对话</text>
  <rect x="306" y="556" width="34" height="18" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M307 557 h32" stroke="#F5F5F5"/>
  <text x="323" y="570" font-size="12" fill="#000" text-anchor="middle">＋</text>
  <rect x="1030" y="556" width="60" height="18" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M1031 557 h58" stroke="#F5F5F5"/>
  <text x="1060" y="570" font-size="11" fill="#000" text-anchor="middle">完全权限</text>
  <rect x="1136" y="552" width="26" height="26" fill="#003C74" stroke="#404040" stroke-width="1"/>
  <path d="M1137 553 h24" stroke="#5686FE"/>
  <text x="1149" y="570" font-size="13" fill="#F5F5F5" text-anchor="middle">↑</text>

  <!-- status bar -->
  <rect x="268" y="592" width="932" height="28" fill="#D4D0C8"/>
  <path d="M268 592 h932" stroke="#F5F5F5"/>
  <rect x="276" y="598" width="300" height="16" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M277 599 h298" stroke="#F5F5F5"/>
  <text x="286" y="610" font-size="11" fill="#000">18 轮 377 步 · 273k tok</text>
  <rect x="584" y="598" width="150" height="16" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M585 599 h148" stroke="#F5F5F5"/>
  <text x="594" y="610" font-size="11" fill="#000">缓存命中 99.5%</text>

  <!-- settings panel, self-contained 2003 chrome -->
  <rect x="1000" y="470" width="188" height="112" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M1001 471 h186" stroke="#F5F5F5"/><path d="M1001 472 h186" stroke="#DFDFDF"/>
  <path d="M1001 585 h186" stroke="#808080"/><path d="M1002 586 h184" stroke="#DFDFDF"/>
  <rect x="1004" y="474" width="180" height="20" fill="url(#titleActive)"/>
  <text x="1012" y="488" font-size="11" font-weight="bold" fill="#EDEDED">Windows 皮肤</text>
  <rect x="1166" y="476" width="16" height="15" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M1167 477 h14" stroke="#F5F5F5"/>
  <text x="1174" y="488" font-size="10" fill="#000" text-anchor="middle">–</text>
  <rect x="1008" y="500" width="172" height="20" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M1009 501 h170" stroke="#F5F5F5"/>
  <rect x="1013" y="505" width="11" height="11" fill="#316AC5" stroke="#404040" stroke-width="1"/>
  <text x="1032" y="515" font-size="11" fill="#000">启用皮肤</text>
  <rect x="1008" y="524" width="172" height="20" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M1009 525 h170" stroke="#F5F5F5"/>
  <path d="M1014 540 h162" stroke="#808080"/><path d="M1015 541 h160" stroke="#DFDFDF"/>
  <rect x="1013" y="529" width="11" height="11" fill="#316AC5" stroke="#404040" stroke-width="1"/>
  <text x="1032" y="539" font-size="11" fill="#000">Windows 2003</text>
  <rect x="1008" y="548" width="172" height="20" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M1009 549 h170" stroke="#F5F5F5"/>
  <path d="M1014 564 h162" stroke="#808080"/><path d="M1015 565 h160" stroke="#DFDFDF"/>
  <rect x="1013" y="553" width="11" height="11" fill="#F4F4F4" stroke="#808080" stroke-width="1"/>
  <text x="1032" y="563" font-size="11" fill="#000">窗口示例</text>
`, 1200, 620);

/* ---------------------------------------------------------------- shot 2 -- */
const shot2 = frame(`
  <rect x="0" y="0" width="900" height="560" fill="#D4D0C8"/>
  <!-- inactive window behind, to show the two title-bar states -->
  <rect x="120" y="40" width="420" height="150" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M121 41 h418" stroke="#F5F5F5"/>
  <rect x="124" y="43" width="412" height="22" fill="url(#titleInactive)"/>
  <text x="132" y="58" font-size="12" font-weight="bold" fill="#EDEDED">失焦窗口（灰渐变）</text>
  ${titleButton(504, 47, "–")}${titleButton(522, 47, "□")}${titleButton(540, 47, "×")}
  <rect x="124" y="67" width="412" height="119" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M125 68 h410" stroke="#F5F5F5"/>
  <text x="140" y="92" font-size="12" fill="#000">标题栏失焦时切成 #808080 → #C0C0C0</text>
  <text x="140" y="114" font-size="12" fill="#000">活动时为 #0A246A → #A6CAF0</text>

  <!-- active specimen window -->
  <rect x="220" y="210" width="460" height="300" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M221 211 h458" stroke="#F5F5F5"/><path d="M221 212 h458" stroke="#DFDFDF"/>
  <path d="M221 509 h458" stroke="#808080"/><path d="M222 510 h456" stroke="#DFDFDF"/>
  <rect x="224" y="214" width="452" height="22" fill="url(#titleActive)"/>
  <text x="232" y="229" font-size="12" font-weight="bold" fill="#EDEDED">示例对话框</text>
  ${titleButton(632, 218, "–")}${titleButton(650, 218, "□")}${titleButton(668, 218, "×")}

  <!-- menu bar -->
  <text x="232" y="252" font-size="12" fill="#000">文件</text>
  <text x="272" y="252" font-size="12" fill="#000">编辑</text>
  <text x="312" y="252" font-size="12" fill="#000">查看</text>
  <text x="352" y="252" font-size="12" fill="#000">帮助</text>
  <rect x="266" y="240" width="42" height="16" fill="#0A246A"/>
  <text x="272" y="252" font-size="12" fill="#EDEDED">编辑</text>

  <!-- client area, sunken -->
  <rect x="232" y="272" width="436" height="60" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M233 273 h434" stroke="#F5F5F5"/>
  <text x="244" y="292" font-size="12" fill="#000">名称(&amp;N):</text>
  <rect x="330" y="278" width="330" height="20" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M331 279 h328" stroke="#F5F5F5"/><path d="M333 281 h324" stroke="#000000"/>
  <text x="340" y="292" font-size="12" fill="#000">DSH 皮肤示例</text>

  <!-- dropdown menu, drawn over the client area -->
  <rect x="266" y="256" width="130" height="76" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M267 257 h128" stroke="#F5F5F5"/>
  <text x="278" y="274" font-size="12" fill="#000">撤销</text>
  <text x="278" y="294" font-size="12" fill="#000">剪切</text>
  <text x="278" y="314" font-size="12" fill="#000">复制</text>

  <!-- status bar -->
  <rect x="232" y="344" width="436" height="20" fill="#D4D0C8"/>
  <rect x="232" y="344" width="140" height="20" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M233 345 h138" stroke="#F5F5F5"/>
  <text x="240" y="358" font-size="11" fill="#000">就绪</text>
  <rect x="378" y="344" width="140" height="20" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M379 345 h138" stroke="#F5F5F5"/>
  <text x="386" y="358" font-size="11" fill="#000">对象: 4 个菜单</text>
  <rect x="524" y="344" width="144" height="20" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M525 345 h142" stroke="#F5F5F5"/>
  <text x="532" y="358" font-size="11" fill="#000">Windows 2003 配色</text>

  <!-- action row -->
  <rect x="548" y="386" width="78" height="24" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M549 387 h76" stroke="#F5F5F5"/><path d="M549 409 h76" stroke="#808080"/>
  <text x="587" y="402" font-size="12" fill="#000" text-anchor="middle">激活(&amp;A)</text>
  <rect x="630" y="386" width="38" height="24" fill="#D4D0C8" stroke="#000000" stroke-width="1"/>
  <path d="M631 387 h36" stroke="#808080"/><path d="M631 388 h36" stroke="#000000"/>
  <text x="649" y="402" font-size="12" fill="#000" text-anchor="middle">确定</text>

  <!-- bevel legend -->
  <text x="60" y="452" font-size="12" fill="#000">凸起 ButtonHighlight #F5F5F5 / ButtonShadow #808080 / ButtonDarkShadow #404040</text>
  <text x="60" y="474" font-size="12" fill="#000">凹陷：输入框、代码块、状态栏分格 —— 1px 阶梯明暗对比</text>
  <text x="60" y="496" font-size="12" fill="#000">直角：全表 border-radius 归零，corner-shape 钉回普通角</text>
`, 900, 560);

/* ---------------------------------------------------------------- shot 3 -- */
const shot3 = frame(`
  <rect x="0" y="0" width="900" height="600" fill="#D4D0C8"/>
  <text x="40" y="48" font-size="15" font-weight="bold" fill="#0A246A">Windows Server 2003 度量表 → 皮肤取值</text>

  <rect x="40" y="70" width="820" height="24" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M41 71 h818" stroke="#F5F5F5"/>
  <text x="52" y="87" font-size="12" fill="#000">界面元素</text>
  <text x="380" y="87" font-size="12" fill="#000">颜色</text>
  <text x="600" y="87" font-size="12" fill="#000">色值</text>
  <text x="740" y="87" font-size="12" fill="#000">落地 token</text>

  <g font-size="12" fill="#000">
    <rect x="40" y="94" width="820" height="22" fill="#C8C4BC"/><path d="M40 94 h820" stroke="#808080"/>
    <text x="52" y="110">3D 控件表面 / 任务栏</text><rect x="380" y="99" width="60" height="13" fill="#D4D0C8" stroke="#404040"/><text x="600" y="110">#D4D0C8</text><text x="740" y="110">bg-base</text>
    <rect x="40" y="116" width="820" height="22" fill="#D4D0C8"/>
    <text x="52" y="132">活动标题栏起点</text><rect x="380" y="121" width="60" height="13" fill="#0A246A"/><text x="600" y="132">#0A246A</text><text x="740" y="132">titlebar-active</text>
    <rect x="40" y="138" width="820" height="22" fill="#C8C4BC"/><path d="M40 138 h820" stroke="#808080"/>
    <text x="52" y="154">活动标题栏终点</text><rect x="380" y="143" width="60" height="13" fill="#A6CAF0"/><text x="600" y="154">#A6CAF0</text><text x="740" y="154">titlebar-active</text>
    <rect x="40" y="160" width="820" height="22" fill="#D4D0C8"/>
    <text x="52" y="176">失焦标题栏起点</text><rect x="380" y="165" width="60" height="13" fill="#808080"/><text x="600" y="176">#808080</text><text x="740" y="176">titlebar-inactive</text>
    <rect x="40" y="182" width="820" height="22" fill="#C8C4BC"/><path d="M40 182 h820" stroke="#808080"/>
    <text x="52" y="198">失焦标题栏终点</text><rect x="380" y="187" width="60" height="13" fill="#C0C0C0"/><text x="600" y="198">#C0C0C0</text><text x="740" y="198">titlebar-inactive</text>
    <rect x="40" y="204" width="820" height="22" fill="#D4D0C8"/>
    <text x="52" y="220">3D 高光</text><rect x="380" y="209" width="60" height="13" fill="#F5F5F5" stroke="#404040"/><text x="600" y="220">#F5F5F5</text><text x="740" y="220">shadow-raised</text>
    <rect x="40" y="226" width="820" height="22" fill="#C8C4BC"/><path d="M40 226 h820" stroke="#808080"/>
    <text x="52" y="242">3D 投影</text><rect x="380" y="231" width="60" height="13" fill="#808080"/><text x="600" y="242">#808080</text><text x="740" y="242">shadow-raised</text>
    <rect x="40" y="248" width="820" height="22" fill="#D4D0C8"/>
    <text x="52" y="264">最深投影</text><rect x="380" y="253" width="60" height="13" fill="#404040"/><text x="600" y="264">#404040</text><text x="740" y="264">border-l4</text>
    <rect x="40" y="270" width="820" height="22" fill="#C8C4BC"/><path d="M40 270 h820" stroke="#808080"/>
    <text x="52" y="286">选中高亮</text><rect x="380" y="275" width="60" height="13" fill="#0A246A"/><text x="600" y="286">#0A246A</text><text x="740" y="286">sidebar-nav-active</text>
    <rect x="40" y="292" width="820" height="22" fill="#D4D0C8"/>
    <text x="52" y="308">代码块</text><rect x="380" y="297" width="60" height="13" fill="#C8C4BC" stroke="#404040"/><text x="600" y="308">#C8C4BC</text><text x="740" y="308">markdown-code-block</text>
    <rect x="40" y="314" width="820" height="22" fill="#C8C4BC"/><path d="M40 314 h820" stroke="#808080"/>
    <text x="52" y="330">提示气泡</text><rect x="380" y="319" width="60" height="13" fill="#FFFFE1" stroke="#404040"/><text x="600" y="330">#FFFFE1</text><text x="740" y="330">tooltip-bg</text>
    <rect x="40" y="336" width="820" height="22" fill="#D4D0C8"/>
    <text x="52" y="352">停止生成</text><rect x="380" y="341" width="60" height="13" fill="#CC0000"/><text x="600" y="352">#CC0000</text><text x="740" y="352">aria-label 命中</text>
  </g>

  <!-- controls strip -->
  <text x="40" y="400" font-size="13" font-weight="bold" fill="#0A246A">控件样式</text>
  <rect x="40" y="416" width="80" height="26" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M41 417 h78" stroke="#F5F5F5"/><path d="M41 440 h78" stroke="#808080"/>
  <text x="80" y="433" font-size="12" fill="#000" text-anchor="middle">按钮（凸起）</text>
  <rect x="140" y="416" width="80" height="26" fill="#D4D0C8" stroke="#000000" stroke-width="1"/>
  <path d="M141 417 h78" stroke="#808080"/><path d="M141 418 h78" stroke="#000000"/>
  <text x="180" y="433" font-size="12" fill="#000" text-anchor="middle">按下（凹陷）</text>
  <rect x="240" y="416" width="120" height="26" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M241 417 h118" stroke="#F5F5F5"/><path d="M243 419 h114" stroke="#000000"/>
  <text x="252" y="433" font-size="12" fill="#000">输入框（凹陷）</text>
  <rect x="380" y="416" width="26" height="26" fill="#003C74" stroke="#404040" stroke-width="1"/>
  <path d="M381 417 h24" stroke="#5686FE"/>
  <text x="418" y="433" font-size="12" fill="#000">主按钮 #003C74</text>
  <rect x="540" y="416" width="26" height="26" fill="#CC0000" stroke="#404040" stroke-width="1"/>
  <path d="M541 417 h24" stroke="#F5F5F5"/>
  <text x="578" y="433" font-size="12" fill="#000">停止 #CC0000</text>
  <rect x="700" y="416" width="16" height="26" fill="#D4D0C8" stroke="#404040" stroke-width="1"/>
  <path d="M701 417 h14" stroke="#F5F5F5"/>
  <rect x="720" y="416" width="26" height="26" fill="#D4D0C8" stroke="#808080" stroke-width="1"/>
  <path d="M721 417 h24" stroke="#F5F5F5"/>
  <text x="760" y="433" font-size="12" fill="#000">16px 直角滚动条</text>

  <text x="40" y="486" font-size="12" fill="#000">字体：规范要求的 11px；皮肤自身不设 font-family（除标题按钮的 Marlett 符号字形），字体完全交给用户设置。</text>
  <text x="40" y="508" font-size="12" fill="#000">纯白：度量表的 ButtonHighlight #FFFFFF 与 Window #FFFFFF 分别换成 #F5F5F5 与 #D4D0C8，全表无纯白。</text>
  <text x="40" y="530" font-size="12" fill="#000">圆角：394 处组件圆角全部读 var(--dsw-radius-*)，因此把 6 个 radius token 直接归零，比逐个追选择器可靠。</text>
  <text x="40" y="552" font-size="12" fill="#000">浮雕：所有立体边都是 1px 阶梯 inset box-shadow —— 高光 #F5F5F5、投影 #808080、最深 #404040。</text>
`, 900, 600);

const out = "docs/screenshots";
mkdirSync(out, { recursive: true });
const shots = [
    ["01-main-window.png", shot1],
    ["02-classic-window.png", shot2],
    ["03-color-system.png", shot3],
];
for (const [name, svg] of shots) {
    const info = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`${out}/${name}`);
    console.log(`  ${name}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
