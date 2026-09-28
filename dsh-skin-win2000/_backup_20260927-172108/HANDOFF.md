# HANDOFF — dsh-skin-win2000

DSH Web GUI 的 Windows Server 2003 皮肤插件。单文件客户端 bundle，无构建步骤。

---

## 1. 目标与验收

把 DSH Web GUI 的外观换成 Windows Server 2003 经典控件风格：中性灰 3D 浮雕、双色渐变标题栏、直角、深灰代码块、无纯白。

验收口径（全部可执行）：

| 检查 | 命令 | 通过条件 |
|---|---|---|
| 规范值与样式完整性 | `node check.mjs` | `ok — spec verified, …` |
| 配色对齐 Win2003 度量表 | `node verify-metrics.mjs` | `全部对齐度量表`，`纯白出现次数: 0` |
| 语法 | `node --check client.js` | 退出码 0 |

---

## 2. 交付物与安装点

```
D:\Desktop\fuck\DSH\dsh-skin-win2000\      ← 源码（工作目录内）
├── package.json          插件清单：name / exports / dsh.bundle / dsh.client
├── cordis.patch.yml      bundle 层补丁：insert 一行 skin-win2000
├── index.js              宿主半，仅 `export function apply() {}`（占位）
├── client.js             全部实现（767 行，无构建产物）
├── check.mjs             最小可运行检查（stub module loader + React + DOM）
└── verify-metrics.mjs    对照 Win2003 度量表的配色回归
```

安装位置（已装好，当前状态）：

| 项 | 值 |
|---|---|
| profile | `web`（`~/.dsh/profiles/web`） |
| 链接 | `node_modules/dsh-skin-win2000` → **Junction** 指向源码目录（改源码即时生效） |
| profile 补丁 | `~/.dsh/profiles/web/cordis.patch.yml` 第 51-52 行：`insert: [{id: skin-win2000, name: dsh-skin-win2000}]` |
| 浏览器入口 | `plugins/??dsh-skin-win2000/client.js&rev=<hash>`（host 按文件 mtime/size 生成 rev） |

**未使用 pnpm**：没有写 profile 的 `package.json` 依赖，靠 junction + patch 行挂载，避免扰动该 profile 里那一大票 `link:` 依赖。

---

## 3. client.js 结构（行号对应当前版本）

| 行 | 符号 | 职责 |
|---|---|---|
| 1-19 | 文件头注释 | 说明为何不走 `ctx.theme.register()` |
| 23-29 | `React` / `SKIN_ATTRIBUTE` / `SKIN_VALUE` / `STORAGE_KEY` | 皮肤属性名 `data-dsh-skin="win2000"` |
| 36 | `WIN2003_TOKENS` | 主配色表（250 项里的绝大部分） |
| 289 | `LUNA_TOKENS` | 变体差异表（当前只留少量覆盖） |
| 344 | `declarations()` | 把 token 表摊平成 `--x:#y !important;…` |
| 352-356 | `TOKEN_SLOT` / `LUNA_SLOT` / `buildStylesheet()` | 运行时把 token 注入样式表（见第 7 节坑 2） |
| 358-436 | `STYLESHEET` | 全部 CSS 规则 |
| 440-467 | `readSettings` / `writeSettings` | `enabled` + `variant`，存 `dsh.skin.win2000` |
| 469 | `project()` | 把设置投影到 DOM：`data-dsh-skin` / `-variant` / `color-scheme` |
| 484 | `PALETTES` | 配色列表（目前只有 Windows 2003 Luna） |
| 489 | `MENUS` | 窗口示例的菜单栏数据 |
| 502 | `SPEC` | **规范值常量表**，check 直接断言它 |
| 526 | `ClassicWindow()` | 窗口示例组件（标题栏 + 三个标题按钮 + 菜单栏 + 客户区 + 状态栏 + 操作按钮） |
| 600-620 | `readUi` / `writeUi` | 面板位置与折叠态，存 `dsh.skin.win2000.ui` |
| 627 | `SkinSettings()` | 右下角面板（标题栏可拖、可折叠、开关、配色、窗口示例） |
| 723 | `inject = ["slots"]` | **必须导出**，否则 fiber 早于 slot 服务激活 |
| 731 | `apply(ctx)` | 注入 `<style>`、应用设置、注册面板 |
| 755-760 | exports | `inject` / `apply` / `SkinSettings` / `ClassicWindow` / `SPEC` |

---

## 4. 配色规范（Win2003 度量表，已逐项对齐）

| 界面元素 | 值 | 落地位置 |
|---|---|---|
| 3D 控件表面 / 任务栏 / 菜单栏 | `#D4D0C8` | `--dsw-alias-bg-base`、面板与窗口背景 |
| 活动标题栏起点 | `#0A246A` | `--dsh-skin-titlebar-active` |
| 活动标题栏终点 | `#A6CAF0` | 同上 |
| 失焦标题栏起点 | `#808080` | `--dsh-skin-titlebar-inactive` |
| 失焦标题栏终点 | `#C0C0C0` | 同上 |
| 3D 高光 | `#F5F5F5` | `--dsh-skin-shadow-raised/…` 第一层 |
| 3D 投影 | `#808080` | 同上，第二层 |
| 最深投影 | `#404040` | `--dsw-alias-border-l4` |
| 选中高亮 | `#0A246A` | `--dsw-specific-sidebar-nav-item-active` |
| 工作区 | `#D4D0C8` | `--dsw-alias-bg-base` |
| 提示气泡 | `#FFFFE1` 底 + `#000000` 字 | `--dsw-alias-tooltip-bg` + `[class*="bubble"]` |
| 代码块 | `#C8C4BC` / 标题条 `#BFBBB2` | `--dsw-alias-markdown-code-block*` |
| 主按钮 | `#003C74`，悬停 `#316AC5` | `--dsw-alias-button-primary-fill/hover` |

**纯白是被刻意移除的**：度量表的 ButtonHighlight `#FFFFFF` 换成 `#F5F5F5`，Window `#FFFFFF` 换成 `#D4D0C8`。`verify-metrics.mjs` 会守住"纯白计数 = 0"。

---

## 5. CSS 规则要点（STYLESHEET 内）

| 规则 | 作用 |
|---|---|
| `body[data-dsh-skin="win2000"]{…}` | 注入 WIN2003 token（`@@TOKENS@@` 槽位）+ 3D 阴影变量 + `font-size:11px` + `-webkit-font-smoothing:none` |
| `… :is(button,summary){box-shadow:var(--dsh-skin-shadow-raised)}` | 按钮凸起 |
| `… :is(input,textarea,select,…){box-shadow:var(--dsh-skin-shadow-sunken)}` | 输入框凹陷 |
| `… :is([role="dialog"],[role="alertdialog"]){…}` | 对话框凸起 |
| `… :is(pre,table,fieldset){…}` | 代码块/表格凹陷 |
| `… :is(…){border-radius:0 !important}` | 全直角（含面板/窗口子树） |
| `… *::-webkit-scrollbar*` | 16px 直角滚动条 |
| `… :is([role="button"],[role="tab"],…):not([aria-pressed="true"]){background:#D4D0C8 !important}` | 防白底；**不碰原生 `<button>`**，主按钮的蓝色因此得以保留 |
| `[data-dsh-skin-panel]…` / `[data-dsh-skin-window]…` | 面板与窗口的**自包含**样式（不读皮肤变量，见第 7 节坑 4） |
| `… [class*="bubble"]{color:#000 !important;background:#FFFFE1 !important}` | 提示气泡（见第 7 节坑 6） |

---

## 6. 持久化与运行时行为

| key | 内容 |
|---|---|
| `dsh.skin.win2000` | `{ enabled, variant, pixel }`（`pixel` 控制 `unsciiCJKV18` 点阵字体） |
| `dsh.skin.win2000.ui` | `{ x, y, folded }`（面板位置与折叠，`x/y` 为 null 表示默认右下角） |

- 皮肤**默认开启**（localStorage 无记录时 `enabled: true`）。
- **浮窗开关状态鲜明**：开启/选中的开关（「启用皮肤」、「点阵字体」、「Windows 2003」）以**深海军蓝 `#0A246A` 高亮底色 + 反白文字 `#EDEDED` + 黑色对勾 ✔** 呈现，关闭项恢复平色灰底与空白框。
- **点阵字体选项**：支持开启 `unsciiCJKV18`（unscii CJK V18）正统像素点阵字体，由 `data-dsh-skin-pixel="unscii"` 驱动全局组件。
- 关闭皮肤 = 移除 `data-dsh-skin`、`data-dsh-skin-variant` 及 `data-dsh-skin-pixel`、释放 `color-scheme`；面板与窗口因自包含而**保持 2003 外观**，方便随时开回来。
- 卸载插件（`ctx.effect` 清理）会移除 `<style>`、清掉所有属性、删除两个 localStorage 键。

**为什么不注册主题**：DSH「设置 → 通用 → 外观」那一行是写死的 `light/dark/system` 三个方块，第三方主题 id 进不去。皮肤因此自己驱动 `body` 属性。

---

## 7. 踩过的坑（重要，别再犯）

| # | 症状 | 真因 | 修法 |
|---|---|---|---|
| 1 | 3D 边框完全不显示，只有平色 | 用了 `:where(...)`，特异性为 0，被组件类规则反超 | 改 `:is(...)`；`check.mjs` 里有两处断言守住 |
| 2 | 皮肤整片消失（元素"都没了"） | 模块级模板字面量里的 `${declarations(...)}` 未求值 / 解析异常，`STYLESHEET` 变成 `NaN` | 改为 `@@TOKENS@@` 槽位 + `buildStylesheet()` 运行时注入；文件头注释也禁止出现裸反引号 |
| 3 | 编辑后皮肤毫无变化 | bundle 响应头是 `cache-control: public, max-age=31536000, immutable`，页面里的 `index.html` 也带旧 `rev` | 必须 `Ctrl+Shift+R` 强制刷新 |
| 4 | 关掉皮肤后，面板自己塌成白底方块 | 面板样式挂在 `body[data-dsh-skin]` 下，属性一移除就全失效 | 面板/窗口样式**全部写字面量**，不读皮肤变量 |
| 5 | 发送按钮变灰（本该深蓝） | 防白底规则写成 `background-color:#D4D0C8 !important`，在 `!important` 层长属性压过主按钮的 `background` 简写 | 该规则不再命中原生 `<button>`，且改用 `background` 简写 |
| 6 | 提示气泡淡黄底 + 近白字 | 基础库 `Tooltip.module.css` 用 `--dsw-static-neutral-bluish-00` 当**文字色**，而皮肤把那档设成了近白 | 单独给 `[class*="bubble"]` 定文字色 |
| 7 | 部分框仍是圆角 | 394 处组件圆角全部走 `var(--dsw-radius-*)`，其中 0 处 `!important`、0 处内联 | 把 6 个 radius token 直接归零（比追选择器可靠） |
| 8 | 工具调用行被套上假边框 | 凸起规则命中了 `[role="button"]`，而聊天里的工具行/思考行都是 `role=button` 的 div | 凸起只给原生 `<button>`/`<summary>` 与 `[role=dialog]` |
| 9 | 面板开关看不出开/关 | 按钮基础样式带 `!important` 压过按下态，且没有高亮条和勾选状态 | 选中的开关赋予 `background: #0A246A !important; color: #EDEDED !important;` 深蓝高亮与黑色对勾 ✔ |
| 10 | 已编辑文件卡片头部深灰黑底太黑 | `--changes-fill` 与 `[class*="_header"]` 继承深色底色 | 覆盖 `:is([class*="_card"],[class*="Card"])` 的 `--changes-fill:#D4D0C8 !important` 与 `_header` 背景为 `#D4D0C8` + 纯黑文字 |
| 11 | 点阵字体未命中 & 浮窗代码等宽选项 | CSS 字体族未包含本地安装的原版字体，缺少代码字体独立选项 | 默认点阵采用 `unscii-16-full-orig.ttf`；浮窗新增代码/等宽下拉框，扩充至 17 种精选字体（全系列点阵、像素中文、知名等宽）并支持「自定义字体...」自由文本输入 |

---

## 8. 验证

```powershell
cd D:\Desktop\fuck\DSH\dsh-skin-win2000
node --check client.js        # 语法
node check.mjs                # 250 tokens / 规范值 / 面板与点阵字体 / 窗口交互 / dispose
node verify-metrics.mjs       # 对照 Win2003 度量表，纯白必须为 0
```

`check.mjs` 覆盖：SPEC 常量逐值、样式表逐条（阴影三态、标题栏渐变、11px、无字体接管、无纯白、radius 归零、滚动条直角、面板/窗口规则、气泡规则）、投影三属性、面板三行与折叠、窗口示例的标题栏/菜单/状态栏/操作按钮及其交互、dispose 清理。

**运行时核对**（host 侧，不需要浏览器）：

```powershell
# 列出运行清单里的皮肤行与 rev
curl.exe -g -s "http://127.0.0.1:3080/" | Select-String "dsh-skin-win2000"
```

---

## 9. 已知限制与风险

1. **依赖哈希类名**：`[class*="bubble"]`、`[class*="_card"]`、`[class*="bubble"]` 这类选择器依赖组件库的 CSS-module 命名。DSH 升级后若命名变化，这两条会静默失效（症状：气泡或卡片配色回到默认）。
2. **`--dsw-static-*` 被改写过**：皮肤的静态色阶不是 DSH 原值。若有组件把"静态最亮档"当**文字色**用（气泡就是例证），会出现浅底浅字。新增 UI 元素时留意。
3. **11px 全局字号**是 Win2003 规范的一部分，正文与代码块一起降到了 11px。
4. **`-webkit-font-smoothing: none` 在 Windows 的 Chromium 上不生效**（走 DirectWrite），写了但改变不了渲染。
5. **字体完全交给用户**：皮肤没有任何 `font-family` 覆盖（唯一例外是窗口标题按钮的 Marlett 符号字形），`dsh-ui-font` 的设置说了算。
6. **直角是通杀的**：头像、状态圆点、开关滑块都会变方。若需要保留圆形，从 `border-radius:0 !important` 的选择器里排除即可。
7. **未做视觉截图验证**：本机无头 Chrome 抓取会挂死，全部验证止于代码断言与 host 侧字节核对。真实观感需要人眼确认。

---

## 10. 后续可做

- 桌面背景 `#3A6EA5`（度量表里的 Background/Desktop）：Web GUI 无对应表面，尚未使用；若要把某个大面积区域改成这个冷石蓝，指位置即可。
- 面板"重置位置"入口（现在只能拖，拖出视口后靠钳制兜底）。
- 若 DSH 后续给第三方主题开放「外观」入口，可以改回 `ctx.theme.register()` 走官方路径。