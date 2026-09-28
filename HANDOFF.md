# HANDOFF — dsh-skin-win2000

DSH Web GUI 的 Windows 2000 皮肤插件。单文件客户端 bundle，无构建步骤。

---

## 1. 目标与验收

把 DSH Web GUI 的外观换成 Windows 2000 经典控件风格：中性灰 3D 浮雕、双色渐变标题栏、直角、深灰代码块、无纯白。

验收口径（全部可执行）：

| 检查 | 命令 | 通过条件 |
|---|---|---|
| 规范值与样式完整性 | `node check.mjs` | `ok — spec verified, …` |
| 配色对齐 Win2000 度量表 | `node verify-metrics.mjs` | `全部对齐度量表`，`纯白出现次数: 0` |
| 语法 | `node --check client.js` | 退出码 0 |

---

## 2. 交付物与安装点

```
D:\Desktop\fuck\DSH\dsh-skin-win2000\      ← 源码（工作目录内）
├── package.json          插件清单：name / exports / dsh.bundle / dsh.client
├── cordis.patch.yml      bundle 层补丁：insert 一行 skin-win2000
├── index.js              宿主半：注册 webServer 前缀路由 /api/dsh-skin-win2000/fonts/
├── client.js             全部实现（约 830 行，单文件无构建产物；行数随编辑漂移，仅作规模参考）
├── check.mjs             最小可运行检查（stub module loader + React + DOM）
└── verify-metrics.mjs    对照 Win2000 度量表的配色回归
```

字体服务（`index.js`）：`ctx.webServer.register({kind:"prefix", path:"/api/dsh-skin-win2000/fonts/"})`
按文件名在两个目录里找字体——`%LOCALAPPDATA%\Microsoft\Windows\Fonts\` 与 `D:\fontwork\`——
命中即以 `font/ttf` / `font/otf` 回源，未命中 404。`FONT_MAP` 只固化 4 个（zpix / unscii-16-full-orig /
unsciiCJKV / unsciiCJKV18），其余走同名兜底。`client.js` 的 `@font-face` 优先 `local()`，
所以系统已装字体时这条 HTTP 路径只是兜底。

安装位置（已装好，当前状态）：

| 项 | 值 |
|---|---|
| profile | `web`（`~/.dsh/profiles/web`） |
| 链接 | `node_modules/dsh-skin-win2000` → **Junction** 指向源码目录（改源码即时生效） |
| profile 补丁 | `~/.dsh/profiles/web/cordis.patch.yml` 第 51-52 行：`insert: [{id: skin-win2000, name: dsh-skin-win2000}]` |
| 浏览器入口 | `plugins/??dsh-skin-win2000/client.js&rev=<hash>`（host 按文件 mtime/size 生成 rev） |

**未使用 pnpm**：没有写 profile 的 `package.json` 依赖，靠 junction + patch 行挂载，避免扰动该 profile 里那一大票 `link:` 依赖。

**本目录不是 git 仓库**——改动**无法回滚**，没有 `git diff`/`git checkout` 兜底。动 `client.js` 之前先手工复制一份快照（`_backup_<时间戳>\` 就是这种产物），改完立刻跑第 8 节那三条命令当护栏。

---

## 3. client.js 结构

**本表只锁顺序与职责，不写行号**——行号会随每次编辑漂移（2026-09-27 那次交接就因为表里写死了行号，
整段对不上，改代码改错位置）。需要行号时现场取：`grep -n "const SPEC" client.js`。

| 符号 | 职责 |
|---|---|
| 文件头注释 | 说明为何不走 `ctx.theme.register()`；**禁止裸反引号**（坑 2） |
| `React` / `SKIN_ATTRIBUTE` / `SKIN_VALUE` / `STORAGE_KEY` / `PIXEL_VALUE` | 皮肤属性 `data-dsh-skin="win2000"`、点阵属性值 `unsciicjkv` |
| `WIN2000_TOKENS` | 主配色表（250 项里的绝大部分） |
| `LUNA_TOKENS` | 变体差异表（当前只留少量覆盖） |
| `declarations()` | 把 token 表摊平成 `--x:#y !important;…` |
| `TOKEN_SLOT` / `LUNA_SLOT` / `buildStylesheet()` | 运行时把 token 注入样式表（见第 7 节坑 2） |
| `STYLESHEET` | 全部 CSS 规则（含 `@font-face` 与点阵字体规则） |
| `readSettings` / `writeSettings` | `enabled` + `pixel`，存 `dsh.skin.win2000` |
| `project()` | 把设置投影到 DOM：`data-dsh-skin` / `-variant` / `-pixel` / `color-scheme` |
| `PALETTES` | 配色列表（目前只有 Windows 2000 Luna；面板未消费，`variant` 也固定 `luna`） |
| `MENUS` | 窗口示例的菜单栏数据 |
| `SPEC` | **规范值常量表**，check 直接断言它 |
| `ClassicWindow()` | 窗口示例组件（标题栏 + 三个标题按钮 + 菜单栏 + 客户区 + 状态栏 + 操作按钮） |
| `UI_KEY` / `readUi` / `writeUi` | 面板位置与折叠态，存 `dsh.skin.win2000.ui` |
| `SkinSettings()` | 右下角面板（标题栏可拖、可折叠、皮肤开关、点阵开关、窗口示例） |
| `inject = ["slots"]` | **必须导出**，否则 fiber 早于 slot 服务激活 |
| `apply(ctx)` | 注入 `<style>`、应用设置、注册面板 |
| exports | `inject` / `apply` / `SkinSettings` / `ClassicWindow` / `SPEC` |

---

## 4. 配色规范（Win2000 度量表，已逐项对齐）

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
| `body[data-dsh-skin="win2000"]{…}` | 注入 WIN2000 token（`@@TOKENS@@` 槽位）+ 3D 阴影变量 + `font-size:11px` + `-webkit-font-smoothing:none` |
| `… :is(button,summary){box-shadow:var(--dsh-skin-shadow-raised)}` | 按钮凸起 |
| `… :is(input,textarea,select,…){box-shadow:var(--dsh-skin-shadow-sunken)}` | 输入框凹陷 |
| `… :is([role="dialog"],[role="alertdialog"]){…}` | 对话框凸起 |
| `… :is(pre,table,fieldset){…}` | 代码块/表格凹陷 |
| `… :is(…){border-radius:0 !important}` | 全直角（含面板/窗口子树） |
| `… *::-webkit-scrollbar*` | 16px 直角滚动条 |
| `… :is([role="button"],[role="tab"],…):not([aria-pressed="true"]){background:#D4D0C8 !important}` | 防白底；**不碰原生 `<button>`**，主按钮的蓝色因此得以保留 |
| `[data-dsh-skin-panel]…` / `[data-dsh-skin-window]…` | 面板与窗口的**自包含**样式（不读皮肤变量，见第 7 节坑 4） |
| `… [class*="bubble"]{color:#000 !important;background:#FFFFE1 !important}` | 提示气泡（见第 7 节坑 6） |
| `@font-face{…}` ×4 | Zpix / Pixel Code / unscii-16-full / unsciiCJKV18；先 `local()` 后 HTTP 兜底（见第 2 节字体服务） |
| `body[…][data-dsh-skin-pixel] :is(button,input,…,pre,code,…){font-family:"unsciiCJKV18",…}` | **主字体**：点阵开关打开时接管全局（选择器含 `pre`/`code`，代码字体因此跟随主字体），`16px` / `line-height:1.25` / `-webkit-font-smoothing:none` / **`text-rendering:optimizeSpeed`**（让字形吸附整数像素——点阵字体的命脉，见坑 15） |
| 同一条规则内的 `font-synthesis:none` + 独立的 `:is(strong,b){text-shadow:1px 0 0 currentColor}` | 禁掉合成粗体/斜体（点阵字一描边就糊），粗体改用 1px 整数位移叠印。见第 7 节坑 13 |

---

## 6. 持久化与运行时行为

| key | 内容 |
|---|---|
| `dsh.skin.win2000` | `{ enabled, pixel }`（`variant` 恒为 `luna`）。**两项都是默认值时不落盘**（`removeItem`），只有偏离默认才写。 |
| `dsh.skin.win2000.ui` | `{ x, y, folded }`（面板位置与折叠，`x/y` 为 null 表示默认右下角） |

- **默认：皮肤开启 + 点阵字体开启**（localStorage 无记录 → `{enabled: true, pixel: true}`）。
- **浮窗开关状态鲜明**：开启/选中的开关（「启用皮肤」、「点阵字体」）以**深海军蓝 `#0A246A` 高亮底色 + 反白文字 `#EDEDED` + 黑色对勾 ✔** 呈现，关闭项恢复平色灰底与空白框。
- **主字体 = `unsciiCJKV18`**，由 `data-dsh-skin-pixel="unsciicjkv"` 驱动全局组件（CSS 用无值选择器 `[data-dsh-skin-pixel]`，属性值只作标识）。**代码/等宽字体不再单独可调**：它跟随主字体；关掉点阵开关就一起回到用户字体。
- 关闭皮肤 = 移除 `data-dsh-skin`、`data-dsh-skin-variant` 及 `data-dsh-skin-pixel`、释放 `color-scheme`；面板与窗口因自包含而**保持 2000 外观**，方便随时开回来。
- 卸载插件（`ctx.effect` 清理）会移除 `<style>`、清掉所有属性、删除两个 localStorage 键。

**为什么不注册主题**：DSH「设置 → 通用 → 外观」那一行是写死的 `light/dark/system` 三个方块，第三方主题 id 进不去。皮肤因此自己驱动 `body` 属性。

---

## 7. 踩过的坑（重要，别再犯）

| # | 症状 | 真因 | 修法 |
|---|---|---|---|
| 1 | 3D 边框完全不显示，只有平色 | 用了 `:where(...)`，特异性为 0，被组件类规则反超 | 改 `:is(...)`；`check.mjs` 里有两处断言守住 |
| 2 | 皮肤整片消失（元素"都没了"）；或 `node --check` 报 `Unexpected identifier` | 模块级模板字面量里的 `${declarations(...)}` 未求值 / 解析异常，`STYLESHEET` 变成 `NaN`。**同源陷阱**：在 `STYLESHEET` 的反引号模板内部（含 CSS 注释里）写反引号，会当场截断模板字符串 | 改为 `@@TOKENS@@` 槽位 + `buildStylesheet()` 运行时注入；**文件头注释与 `STYLESHEET` 内部一律不得出现反引号**（2026-09-27 又踩一次，注释里写 `` `font-synthesis:none` `` 直接报错） |
| 3 | 编辑后皮肤毫无变化 | bundle 响应头是 `cache-control: public, max-age=31536000, immutable`，页面里的 `index.html` 也带旧 `rev` | 必须 `Ctrl+Shift+R` 强制刷新 |
| 4 | 关掉皮肤后，面板自己塌成白底方块 | 面板样式挂在 `body[data-dsh-skin]` 下，属性一移除就全失效 | 面板/窗口样式**全部写字面量**，不读皮肤变量 |
| 5 | 发送按钮变灰（本该深蓝） | 防白底规则写成 `background-color:#D4D0C8 !important`，在 `!important` 层长属性压过主按钮的 `background` 简写 | 该规则不再命中原生 `<button>`，且改用 `background` 简写 |
| 6 | 提示气泡淡黄底 + 近白字 | 基础库 `Tooltip.module.css` 用 `--dsw-static-neutral-bluish-00` 当**文字色**，而皮肤把那档设成了近白 | 单独给 `[class*="bubble"]` 定文字色 |
| 7 | 部分框仍是圆角 | 394 处组件圆角全部走 `var(--dsw-radius-*)`，其中 0 处 `!important`、0 处内联 | 把 6 个 radius token 直接归零（比追选择器可靠） |
| 8 | 工具调用行被套上假边框 | 凸起规则命中了 `[role="button"]`，而聊天里的工具行/思考行都是 `role=button` 的 div | 凸起只给原生 `<button>`/`<summary>` 与 `[role=dialog]` |
| 9 | 面板开关看不出开/关 | 按钮基础样式带 `!important` 压过按下态，且没有高亮条和勾选状态 | 选中的开关赋予 `background: #0A246A !important; color: #EDEDED !important;` 深蓝高亮与黑色对勾 ✔ |
| 10 | 已编辑文件卡片头部深灰黑底太黑 | `--changes-fill` 与 `[class*="_header"]` 继承深色底色 | 覆盖 `:is([class*="_card"],[class*="Card"])` 的 `--changes-fill:#D4D0C8 !important` 与 `_header` 背景为 `#D4D0C8` + 纯黑文字 |
| 11 | 点阵字体未命中 | CSS 字体族未包含本地安装的原版字体 | 字体族按「本地名 + `@font-face` `local()`」逐个列出；宿主半加 `/api/dsh-skin-win2000/fonts/` 做 HTTP 兜底（见第 2 节） |
| 12 | 代码字体下拉 17 个选项，选择困难，且与主字体互相打架 | 同一个下拉既驱动代码字体，又被 `project()` 反投影到 `data-dsh-skin-pixel` 去改主字体，两个轴耦合在一起 | **取消该下拉**，代码字体跟随主字体。`data-dsh-skin-mono`、`MONO_FONTS`、`settings.mono`/`customMono`、`--dsh-custom-mono` 及 17 条 `[data-dsh-skin-mono=…]` 规则一并删除；`check.mjs` 加断言守着"不许再加回来" |
| 13 | 加粗的字边缘发虚、看着糊 | `unsciiCJKV18.otf` 只有 normal 一个字重，`<strong>`/`<b>` 仍带 `font-weight:bold`（它们不在主字体规则的选择器白名单里），浏览器于是**合成粗体**——对轮廓描边，点阵字形一描边就糊成灰边 | 主字体规则加 `font-synthesis:none !important`（该属性可继承，写在 `body[...]` 上即让所有后代免疫合成）；粗体改用点阵字体本来的做法——**1px 整数位移叠印** `text-shadow:1px 0 0 currentColor !important`，清晰且仍比正文重 |
| 14 | 英文加粗糊，中文正常 | 拉丁字形在 16px 下 advance 只有 8px、墨迹 7px、笔画约 1px 宽，抗锯齿灰边在这么细的笔画上占比过大；中文笔画 2–3px，同样幅度看不出来 | **疑似真因见坑 15**（已改 `text-rendering:optimizeSpeed`，观感是否改善待人工复核）。**另有一条死路已试过并回退**：借系统等宽真粗体（`@font-face` + `unicode-range` 把拉丁截给 Consolas Bold）——Consolas advance ≈ 8.8px 对点阵的 8px，等宽布局逐字漂移约 10%，一行英文就歪出十几像素。结论：**任何用在这里的粗体面，advance 必须严格等于 8px**，字体风格其次 |
| 15 | 拉丁字加粗后笔画带灰边、发虚 | 主字体规则里的 `text-rendering:geometricPrecision`——它的语义正是"允许字形按非整数像素位置渲染"，与点阵网格直接冲突。中文笔画粗扛得住，1px 的拉丁竖笔扛不住 | 改 `text-rendering:optimizeSpeed`：倾向整数像素定位，并禁用连字与字距调整，正是点阵字体要的。`check.mjs` 加断言禁止 `geometricPrecision` 回来。**注**：此改动 2026-09-27 落地，英文加粗的实际观感**未经人眼复核**（本机无法截图，见第 9 节第 7 条） |

---

## 8. 验证

```powershell
cd D:\Desktop\fuck\DSH\dsh-skin-win2000
node --check client.js        # 语法
node check.mjs                # 250 tokens / 规范值 / 字体约定 / 投影 / 面板与窗口交互 / dispose
node verify-metrics.mjs       # 对照 Win2000 度量表，纯白必须为 0
```

`check.mjs` 覆盖：SPEC 常量逐值、样式表逐条（阴影三态、标题栏渐变、11px、无纯白、radius 归零、滚动条直角、面板/窗口规则、气泡规则）、**字体约定**（CJKV18 居字体族首位、`font-synthesis:none` 在位、`text-rendering:optimizeSpeed` 在位且全表不得出现 `geometricPrecision`、1px 叠印规则在位、全表不得再出现 `data-dsh-skin-mono`、不得再出现借来的 `Win2000 Latin` 面）、投影属性（含默认点阵）、面板三行与折叠、窗口示例的标题栏/菜单/状态栏/操作按钮及其交互、dispose 清理。

**运行时核对**（host 侧，不需要浏览器）：

```powershell
# 列出运行清单里的皮肤行与 rev
curl.exe -g -s "http://127.0.0.1:3080/" | Select-String "dsh-skin-win2000"
```

---

## 9. 已知限制与风险

1. **依赖哈希类名**：`[class*="bubble"]`、`[class*="_card"]`、`[class*="bubble"]` 这类选择器依赖组件库的 CSS-module 命名。DSH 升级后若命名变化，这两条会静默失效（症状：气泡或卡片配色回到默认）。
2. **`--dsw-static-*` 被改写过**：皮肤的静态色阶不是 DSH 原值。若有组件把"静态最亮档"当**文字色**用（气泡就是例证），会出现浅底浅字。新增 UI 元素时留意。
3. **11px 全局字号**是 Win2000 规范的一部分，正文与代码块一起降到了 11px。
4. **`-webkit-font-smoothing: none` 在 Windows 的 Chromium 上不生效**（走 DirectWrite），写了但改变不了渲染。点阵字的锐利度实际靠 **`text-rendering:optimizeSpeed`** 让字形吸附整数像素来保证（见第 8 条）——那一句才是真正起作用的。
5. **字体由皮肤接管**：点阵开关打开时（默认打开）`unsciiCJKV18` 覆盖全局 `font-family` 并把字号抬到 16px，`dsh-ui-font` 的设置会被压过；关掉开关才回到用户字体。窗口标题按钮另用 Marlett 符号字形。
6. **直角是通杀的**：头像、状态圆点、开关滑块都会变方。若需要保留圆形，从 `border-radius:0 !important` 的选择器里排除即可。
7. **未做视觉截图验证**：本机无头 Chrome 抓取会挂死，全部验证止于代码断言与 host 侧字节核对。真实观感需要人眼确认。
8. **粗体只能是叠印，且必须配合 `optimizeSpeed`**：`unsciiCJKV18` 只有一个字重，`<strong>`/`<b>` 的粗体靠 1px 整数位移叠印实现；只有字形吸附到整数像素（`text-rendering:optimizeSpeed`）时，叠印副本才是实心的，笔画才不带灰边。**不要试图借系统粗体字体来救**——度量（尤其 advance）一旦不等于 8px，等宽布局立刻逐字漂移（2026-09-27 试过 Consolas Bold，已回退）。若确实需要真正的粗体字形，唯一出路是给 unsciiCJKV18 造一个 Bold 字重：advance 必须与原字体逐字相同，轮廓坐标仍落在 4 单位网格上（位图膨胀 1px → 轮廓化可行，本机 fontTools 4.63 可用、`pathops` 未装，但点阵字形走位图路线不需要它）。

---

## 10. 后续可做

- 桌面背景 `#3A6EA5`（度量表里的 Background/Desktop）：Web GUI 无对应表面，尚未使用；若要把某个大面积区域改成这个冷石蓝，指位置即可。
- 面板"重置位置"入口（现在只能拖，拖出视口后靠钳制兜底）。
- 若 DSH 后续给第三方主题开放「外观」入口，可以改回 `ctx.theme.register()` 走官方路径。
- **两个孤儿 `@font-face`**：`Zpix` 与 `Pixel Code` 的声明在取消字体调节后已无规则引用（浏览器不会因此下载，成本为零）。留着是给将来的点阵变体留口子，确定不要可删。
- `PALETTES` 与 `settings.variant` 是死代码（只列 luna 一项且面板未消费），可一并清理。
- **遗留备份目录**：源码目录下有 `_backup_20260927-172108\`，是 2026-09-27 那轮字体改造前的 `client.js` / `check.mjs` / `HANDOFF.md` 快照。因为没有 git，它是当时唯一的回滚点；当前状态已验证无误后可以删，删之前建议确认一下最新版确实更好。