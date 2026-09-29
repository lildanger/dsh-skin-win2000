# HANDOFF — dsh-skin-win2000

DSH Web GUI 的 Windows 2000 皮肤插件。单文件客户端 bundle，无构建步骤。

**仓库**：<https://github.com/lildanger/dsh-skin-win2000>（public）
**npm**：<https://www.npmjs.com/package/dsh-skin-win2000>（当前 `1.0.1`）

---

## 1. 目标与验收

把 DSH Web GUI 的外观换成 Windows 2000 经典控件风格：中性灰 3D 浮雕、双色渐变标题栏、直角、深灰代码块、无纯白。

验收口径（全部可执行，全部从仓库根运行）：

| 检查 | 命令 | 通过条件 |
|---|---|---|
| 客户端规范与样式 | `node check.mjs` | `ok — spec verified, …` |
| 宿主字体路由 | `node check-host.mjs` | `ok — host font route serves the bundled face and refuses the rest` |
| 配色对齐度量表 | `node verify-metrics.mjs` | `全部对齐度量表`、`纯白出现次数: 0` |
| 语法 | `node --check client.js` | 退出码 0 |
| **运行时真实生效** | `node tools/probe-live-css.mjs` | `核对 199 个 token: 缺失 0，不一致 0`（199 = 值为色值的 token，见第 7 节坑 17） |

---

## 2. 交付物与位置

**仓库根就是包本体**——DSH 从 Git 地址安装时读的是根 manifest，所以 `dsh.bundle.patch` 必须在根。

```
D:\Desktop\fuck\DSH\                 ← 仓库根 = npm 包根 = junction 目标
├── package.json          插件清单 + npm 元数据（version 在这里改）
├── cordis.patch.yml      bundle 层补丁：insert 一行 skin-win2000
├── client.js             全部客户端实现（单文件，无构建）
├── index.js              宿主半：webServer 前缀路由，从包内 fonts/ 供字体
├── check.mjs             客户端最小可运行检查（stub loader + React + DOM）
├── check-host.mjs        宿主半检查（直接驱动路由 handler）
├── verify-metrics.mjs    对照度量表的配色回归
├── fonts/
│   ├── unsciiCJKV18.otf  随包分发的点阵字体（6.37 MB，许可见该目录 README）
│   └── README.md         来源、许可、移除方法
├── docs/screenshots/     三张实机截图（tools/capture.mjs 生成）
├── tools/
│   ├── capture.mjs       用 CDP 抓真实界面截图
│   ├── probe-live-css.mjs 在浏览器里核对注入后的样式表
│   └── font-license.mjs  读字体 name 表的许可字段
├── README.md             中文说明（GitHub 默认显示）
├── README.en.md          英文说明
├── LICENSE               MIT
├── HANDOFF.md            本文档
└── workspace/            本地脚本与锁文件（已 gitignore，不随包发布）
```

**字体服务**（`index.js`）：`ctx.webServer.register({kind:"prefix", path:"/api/dsh-skin-win2000/fonts"})`
**路径不带尾斜杠**——服务器的匹配规则是 `pathname === prefix || pathname.startsWith(prefix + "/")`，
存了尾斜杠就要求请求里出现双斜杠，永远匹配不上（详见第 7 节坑 16）。
解析顺序：**包内 `fonts/` 优先**，作者本机字体目录仅作开发兜底。

**安装位置**（本机当前状态）：

| 项 | 值 |
|---|---|
| profile | `web`（`~/.dsh/profiles/web`） |
| 链接 | `node_modules/dsh-skin-win2000` → **Junction** → `D:\Desktop\fuck\DSH`（改源码即时生效） |
| profile 补丁 | `~/.dsh/profiles/web/cordis.patch.yml`：`insert: [{id: skin-win2000, name: dsh-skin-win2000}]` |
| 浏览器入口 | `plugins/??dsh-skin-win2000/client.js&rev=<hash>`（host 按文件 mtime/size 生成 rev） |

---

## 3. client.js 结构

**本表只锁顺序与职责，不写行号**——行号随每次编辑漂移。需要行号时现场取：`grep -n "const SPEC" client.js`。

| 符号 | 职责 |
|---|---|
| 文件头注释 | 说明为何不走 `ctx.theme.register()`；**禁止裸反引号**（坑 2） |
| `React` / `SKIN_ATTRIBUTE` / `SKIN_VALUE` / `STORAGE_KEY` / `PIXEL_VALUE` | 皮肤属性 `data-dsh-skin="win2000"`、点阵属性值 |
| `WIN2000_TOKENS` | 主配色表（**210 个 token**；另有 `LUNA_TOKENS` 50 个覆盖，合计 260 个定义行） |
| `LUNA_TOKENS` | 变体差异表 |
| `declarations()` | 把 token 表摊平成 `--x:#y !important;…` |
| `TOKEN_SLOT` / `LUNA_SLOT` / `buildStylesheet()` | 运行时把 token 注入样式表（坑 2、坑 17） |
| `STYLESHEET` | 全部 CSS 规则（含 `@font-face` 与点阵字体规则） |
| `readSettings` / `writeSettings` | `enabled` + `pixel`，存 `dsh.skin.win2000` |
| `project()` | 投影到 DOM：`data-dsh-skin` / `-variant` / `-pixel` / `color-scheme` |
| `PALETTES` / `MENUS` | 配色列表（死代码）、窗口示例的菜单数据 |
| `SPEC` | **规范值常量表**，check 直接断言它 |
| `ClassicWindow()` | 窗口示例（标题栏 + 三标题按钮 + 菜单栏 + 客户区 + 状态栏 + 操作行） |
| `UI_KEY` / `readUi` / `writeUi` | 面板位置与**档位**，存 `dsh.skin.win2000.ui` |
| `SkinSettings()` | 右下角面板：可拖、**三档循环**（见第 6 节） |
| `drag` / `dragged` ref | 拖动状态；`dragged` 用来吞掉拖动结束时浏览器补发的 click（坑 19） |
| `cycleStage()` | 档位 0→1→2→0 |
| `inject = ["slots"]` | **必须导出**，否则 fiber 早于 slot 服务激活 |
| `apply(ctx)` | 注入 `<style>`、应用设置、注册面板 |
| exports | `inject` / `apply` / `SkinSettings` / `ClassicWindow` / `SPEC` |

---

## 4. 配色规范（度量表，已逐项对齐）

| 界面元素 | 值 | 落地位置 |
|---|---|---|
| 3D 控件表面 / 任务栏 / 菜单栏 | `#D4D0C8` | `--dsw-alias-bg-base`、面板与窗口背景 |
| 活动标题栏起点 → 终点 | `#0A246A` → `#A6CAF0` | `--dsh-skin-titlebar-active` |
| 失焦标题栏起点 → 终点 | `#808080` → `#C0C0C0` | `--dsh-skin-titlebar-inactive` |
| 3D 高光 | `#F5F5F5` | `--dsh-skin-shadow-raised/…` 第一层 |
| 3D 投影 | `#808080` | 同上，第二层 |
| 最深投影 | `#404040` | `--dsw-alias-border-l4` |
| 选中高亮 | `#0A246A` | `--dsw-specific-sidebar-nav-item-active` |
| **网页链接** | **`#0000FF`** | `--dsw-alias-link` 与 `--shiki-token-link`（98.css 的 `--link-blue`，见坑 20） |
| 提示气泡 | `#FFFFE1` 底 + `#000000` 字 | `--dsw-alias-tooltip-bg` + `[class*="bubble"]` |
| 代码块 | `#C8C4BC` / 标题条 `#BFBBB2` | `--dsw-alias-markdown-code-block*` |
| 变更卡片 | `#C8C4BC`，标题带 `#BFBBB2` | `[class*="_card"]` 与 `--changes-fill` |
| 主按钮 | `#003C74`，悬停 `#316AC5` | `--dsw-alias-button-primary-fill/hover` |
| 停止生成 | `#CC0000` | `aria-label="停止生成"` 命中 |
| 侧栏分隔 | 凹槽 `inset -1px 0 #808080, -2px 0 #F5F5F5` | `[class*="_sidebarCol"]` |

**纯白是被刻意移除的**：度量表的 ButtonHighlight `#FFFFFF` 换成 `#F5F5F5`，Window `#FFFFFF` 换成 `#D4D0C8`。`verify-metrics.mjs` 守住"纯白计数 = 0"。

**98.css 参照值**（用于对齐经典观感的权威来源，取自其 `style.css`）：
`--surface:#c0c0c0`、`--button-highlight:#ffffff`、`--button-face:#dfdfdf`、`--button-shadow:#808080`、
`--window-frame:#0a0a0a`、`--dialog-blue:#000080`、`--dialog-blue-light:#1084d0`、`--link-blue:#0000ff`。
皮肤用的是同一套 bevel 关系，只把纯白换成 `#F5F5F5`。

---

## 5. CSS 规则要点

| 规则 | 作用 |
|---|---|
| `body[data-dsh-skin="win2000"]{…}` | 注入 token（`@@TOKENS@@` 槽位）+ 3D 阴影变量 + `font-size:11px` + `-webkit-font-smoothing:none` |
| `… :is(button,summary){box-shadow:…raised}` | 按钮凸起；**只给原生按钮与 summary**（坑 8） |
| `… :is(input,textarea,select,…){…sunken}` | 输入框凹陷 |
| `… :is([role="dialog"],[role="alertdialog"])` | 对话框凸起 |
| `… :is(pre,table,fieldset)` | 代码块/表格凹陷 |
| `… :is(…){border-radius:0 !important}` | 全直角（含面板/窗口子树） |
| `… *::-webkit-scrollbar*` | 16px 直角滚动条；`thumb` 必须 `background-clip:border-box`（坑 18） |
| `… :is([role="button"],…):not([aria-pressed="true"]){background:#D4D0C8 !important}` | 防白底；**不碰原生 `<button>`**（坑 5） |
| `nav[aria-label] button[data-index]` | 轮次导航的快速定位标记——**从凸起规则里排除**，否则每个标记都套框（坑 21） |
| `[class*="_sidebarCol"]` / `[class$="_handle"]` | 侧栏边缘的两像素凹槽与把手反馈（原本是 0.5px 细线 + 全透明 8px 把手） |
| `[data-dsh-skin-panel]…` / `[data-dsh-skin-window]…` | 面板与窗口的**自包含**样式，不读皮肤变量（坑 4） |
| `… [class*="bubble"]{color:#000;background:#FFFFE1}` | 提示气泡（坑 6） |
| `@font-face{font-family:"unsciiCJKV18";src:url(…),local(…)}` | 包内字体优先，本机同名字体仅兜底 |
| `body[…][data-dsh-skin-pixel] :is(…)` | **主字体**：点阵开关打开时接管全局；`16px` / `line-height:1.25` / `font-synthesis:none` / **`text-rendering:optimizeSpeed`**（点阵字吸附整数像素的命脉，坑 15） |
| `:is(strong,b){text-shadow:1px 0 0 currentColor}` | 粗体用 1px 整数位移叠印，而非合成描边（坑 13） |

---

## 6. 持久化与运行时行为

| key | 内容 |
|---|---|
| `dsh.skin.win2000` | `{ enabled, pixel }`；**两项都是默认值时不落盘** |
| `dsh.skin.win2000.ui` | `{ x, y, stage }`——`x/y` 为 null 表示默认右下角；**`stage` 是三档**：0 完整面板 / 1 只剩标题栏 / 2 一个小 ＋。旧的 `folded:true` 会读成 stage 1 |

- **默认：皮肤开启 + 点阵字体开启**。
- **面板三档循环**：标题栏右侧按钮点击循环 0→1→2→0；**最小档的小 ＋ 本身也是拖动把手**，拖动超过 3px 只记位置、**不换档**（坑 19）。
- **双击标题栏**把面板位置重置回右下角。
- 关闭皮肤 = 移除三个属性、释放 `color-scheme`；面板与窗口因自包含而**保持 2000 外观**。
- 卸载插件会移除 `<style>`、清属性、删两个 localStorage 键。

**为什么不注册主题**：DSH「设置 → 通用 → 外观」那一行写死 `light/dark/system`，第三方主题 id 进不去，皮肤因此自己驱动 `body` 属性。

---

## 7. 踩过的坑（重要，别再犯）

| # | 症状 | 真因 | 修法 |
|---|---|---|---|
| 1 | 3D 边框完全不显示 | `:where(...)` 特异性为 0，被组件类规则反超 | 改 `:is(...)`；check 有断言守住 |
| 2 | 皮肤整片消失 / `node --check` 报 `Unexpected identifier` | 模块级模板字面量里的 `${…}` 解析异常；**或 CSS 注释里写了反引号，当场截断模板字符串** | 改 `@@TOKENS@@` 槽位 + `buildStylesheet()`；**`STYLESHEET` 内部一律不得出现反引号**（已踩两次） |
| 3 | 编辑后皮肤毫无变化 | bundle 响应头 `immutable` + 页面里 `index.html` 带旧 rev | 必须 `Ctrl+Shift+R` |
| 4 | 关掉皮肤后面板塌成白底方块 | 面板样式挂在 `body[data-dsh-skin]` 下，属性一移除就失效 | 面板/窗口样式全部写字面量 |
| 5 | 发送按钮变灰 | 防白底规则用 `background-color !important`，在 `!important` 层长属性压过简写 | 不命中原生 `<button>`，改用 `background` 简写 |
| 6 | 提示气泡淡黄底 + 近白字 | 基础库拿"静态最亮档"当**文字色**，而皮肤把那档设成近白 | 单独给 `[class*="bubble"]` 定文字色 |
| 7 | 部分框仍是圆角 | 394 处组件圆角全走 `var(--dsw-radius-*)` | 把 6 个 radius token 直接归零 |
| 8 | 工具调用行被套假边框 | 凸起规则命中了 `role=button` 的 div | 凸起只给原生 `<button>`/`<summary>`/`[role=dialog]` |
| 9 | 面板开关看不出开/关 | 按钮基础样式带 `!important` 压过按下态 | 选中项深蓝高亮 + 黑色对勾 |
| 10 | 变更卡片头部太黑 | `--changes-fill` 继承深色底 | 覆盖 `[class*="_card"]` 的 `--changes-fill` |
| 11 | 点阵字体未命中 | 字体族未包含本地原版名 | 字体族逐个列出 + host 路由兜底 |
| 12 | 代码字体下拉与主字体打架 | 同一下拉同时驱动两个轴 | 取消该下拉，代码字体跟随主字体 |
| 13 | 加粗边缘发虚 | 字体只有一个字重，浏览器**合成粗体**描边 | `font-synthesis:none` + 1px 叠印 |
| 14 | 英文加粗糊、中文正常 | 拉丁 advance 只有 8px，抗锯齿灰边占比过大 | 见坑 15。**死路**：借 Consolas Bold——advance 8.8px ≠ 8px，等宽布局漂移 10%，已回退 |
| 15 | 拉丁加粗带灰边 | `text-rendering:geometricPrecision` 允许非整数像素定位，与点阵网格冲突 | 改 `optimizeSpeed`；check 禁止 `geometricPrecision` 回来 |
| 16 | **字体路由一直 404** | 注册的前缀写成 `/api/…/fonts/`（带尾斜杠），而服务器按 `startsWith(prefix + "/")` 匹配，实际要求双斜杠 | 前缀去掉尾斜杠；`check-host.mjs` 复现匹配规则并断言 |
| 17 | **改完 token 却"验证不到"** | **客户端 bundle 发给浏览器的是源码文本**，`${TOKEN_SLOT}` → `@@TOKENS@@` → token 声明这三步**全在浏览器里发生**。grep bundle 永远搜不到展开后的 CSS | 用 `tools/probe-live-css.mjs` 在浏览器里读注入后的样式表；搜 bundle 只能验证源码字符串 |
| 18 | **滚动条滑块偏左、左边亮边被裁** | 主题包给 `thumb` 设了 `background-clip:content-box` + 透明边框，绘制盒比元素盒窄 1px 且偏移 | thumb 重设 `background-clip:border-box` + `border:0` |
| 19 | **拖小加号会弹出面板** | 小加号既是拖动把手又是按钮，浏览器在 `pointerup` 后**还会补一个 click** | 记录位移，超过 3px 就判定为拖动并**吞掉随后的 click** |
| 20 | 链接色不是经典蓝 | 皮肤用了 Luna 的 `#003C74`，而经典参照是 98.css 的 `--link-blue:#0000ff` | 两个 link token 都改 `#0000FF`；check 断言 |
| 21 | 每个定位标记都套着框 | 标记是 `<button>`，被"所有按钮凸起"的规则命中；DSH 原本画的是无边框标记 | `nav[aria-label] button[data-index]` 排除，且特异性要高于按下态规则 |
| 22 | **改错了元素** | 报告说"侧边栏"，我改了**聊天区**的 `[data-width-handle]` | 先用像素/DOM 证据定位到具体元素（`_sidebarCol` / `_handle` 各自全局唯一），再改 |
| 23 | 脚本 anchor 匹配不上 | 工作区文件是 **CRLF**，而脚本里的锚点用 LF | 脚本读入后 `.replace(/\r\n/g, "\n")`，写回统一 LF |
| 24 | PowerShell 吃掉/误解脚本内容 | here-string 里的反引号、引号、`!` 会被解析 | **用 `write` 工具写脚本文件**，再 `node 脚本` 执行；提交消息用 `git commit -F 文件` |

---

## 8. 验证

```powershell
cd D:\Desktop\fuck\DSH
node --check client.js          # 语法
node check.mjs                  # 250 条声明 / 规范值 / 字体约定 / 面板三档 / dispose
node check-host.mjs             # 宿主字体路由：供包内字体、404 未知、拒绝穿越
node verify-metrics.mjs         # 对照度量表，纯白必须为 0
node tools/probe-live-css.mjs   # 浏览器里核对注入后的样式表（需要 Chrome + DSH 在跑）
```

`check.mjs` 覆盖：SPEC 常量逐值、样式表逐条（阴影三态、标题栏渐变、11px、无纯白、radius 归零、滚动条、面板/窗口规则、气泡、侧栏凹槽、定位标记排除、链接色）、字体约定、投影属性、**面板三档循环**（含"拖动后的 click 不换档"的真实指针流程）、窗口示例交互、dispose 清理。

`tools/probe-live-css.mjs`：CDP 开无头 Chrome → 等样式表注入 → **逐条比对 199 个带色值的 token**（另有 11 个值不是色值，如 `0px`、`none`）→ 报告缺失/不一致/槽位残留。**这是唯一能证明 token 真正生效的方法**（坑 17）。

---

## 9. 发布：Git 与 npm（版本号规则见下）

**约定：用户说「git 上去」时，`commit + push + npm publish` 三件一起做**，版本号按下面的规则自动判定。

### 版本号怎么定

**按这次改了多少东西判断**，不是按提交数量：

| 改动性质 | 版本位 | 例子 |
|---|---|---|
| **修正**：改颜色、文案、单条样式、修 bug | **patch** `1.0.1 → 1.0.2` | 链接色、滑块定位、卡片底色 |
| **新增**：加交互、加组件、加一组规则、加文件 | **minor** `1.0.2 → 1.1.0` | 三档面板、字体打包、侧栏凹槽 |
| **不兼容**：改安装方式、改 token 名或皮肤属性、删功能 | **major** `1.1.0 → 2.0.0` | 改 `data-dsh-skin` 值、改包名 |

**拿不准就往小的一档算**（改动里既有修正又有新增时，按**最高的那一档**）。

### 发布流程

```powershell
cd D:\Desktop\fuck\DSH

# 1. 先跑验证，四条全绿再往下
node check.mjs; node check-host.mjs; node verify-metrics.mjs

# 2. 按上面的规则改 package.json 的 version
#    （node -e "const f='package.json'..." 或直接编辑）

# 3. 提交推送
git add -A
git commit -m "<提交信息>"
git push

# 4. 发布
npm publish

# 5. 验证（注意索引延迟，见下）
npm view dsh-skin-win2000@<新版本> version
```

### 文档也算发布内容

`HANDOFF.md` 已在 `package.json` 的 `files` 里，**随包发布** —— 否则一次纯文档改动会发出版本号不同、内容却逐字节相同的 tarball。

由此推出两条操作口径：

- **代码、样式、字体、包结构、README 的任何变化 → 必须发版**（patch 起）。
- **同一轮工作里的文档措辞微调 → 并进下一次发版**，不单独占一个版本号。

### 发布相关的既知事实

- **认证**：本机 `~/.npmrc` 里有带 **Bypass 2FA** 的 granular access token（90 天有效），所以 `npm publish` **不需要动态码**。token **不要发给任何人**，也不要贴进对话。
- **索引延迟**：`npm publish` 返回成功后，`npm view` 可能**还要 30–90 秒**才能看到新版本，并提示 "being processed"。查具体版本号（`@1.0.1`）比查 `latest` 更快。
- **不可撤销**：发布 72 小时内可 unpublish，之后只能 `deprecate`。所以**字体、包名这类难以更改的东西，发布前确认好**。
- **包名占用**：`dsh-skin-win2000` 已发布，别人不能再占。
- **本地 devDeps**：本机的 junction 指向仓库根，所以改源码立即生效，与 npm 上的版本互不影响。

### npm 徽章

两个 README 顶部都有 `img.shields.io/npm/v/dsh-skin-win2000` 徽章，会自动跟随最新版本，无需手工维护。

---

## 10. 已知限制与风险

1. **依赖哈希类名**：`[class*="bubble"]`、`[class*="_card"]`、`[class*="_selected"]`、`[class$="_handle"]` 这类选择器依赖 CSS-module 命名。DSH 升级后若命名变化会**静默失效**。改动前先用 `grep` 确认该后缀在已装包里是否唯一。
2. **`--dsw-static-*` 被改写过**：若有组件把"静态最亮档"当文字色用（气泡就是例证），会出现浅底浅字。
3. **11px 全局字号**是度量表的一部分，正文与代码块一起降到 11px。
4. **`-webkit-font-smoothing:none` 在 Windows Chromium 上不生效**（走 DirectWrite），真正起作用的是 `text-rendering:optimizeSpeed`。
5. **字体由皮肤接管**：点阵开关打开时（默认）`unsciiCJKV18` 覆盖全局字体并把字号抬到 16px；关掉才回到用户字体。
6. **直角是通杀的**：头像、状态圆点、开关滑块都会变方。
7. **粗体只能靠叠印**：字体只有一个字重，必须配合 `optimizeSpeed` 才实心。若真需要 Bold 字重，得给字体造一个（advance 必须逐字等于 8px）。
8. **截图是实拍但环境是你本机**：`docs/screenshots/` 由 `tools/capture.mjs` 抓取，用的是你的点阵字体与配色设置，所以**字体观感与你一致、与别人可能不同**。

---

## 11. 后续可做

- **桌面背景 `#3A6EA5`**（度量表里的 Background/Desktop）：Web GUI 无对应表面，尚未使用。
- **面板"重置位置"入口**：现在只能拖 + 双击归位。
- **若 DSH 给第三方主题开放「外观」入口**：可以改回 `ctx.theme.register()` 走官方路径。
- **死代码**：`PALETTES` 与 `settings.variant` 只列 luna 一项且面板未消费，可清理。
- **字体子集化**：`unsciiCJKV18.otf` 6.37 MB，若只保留常用字可大幅缩小（代价是生僻字回退，破坏"显示一致"的目标，故未做）。
- **粗体字重**：给 `unsciiCJKV18` 造一个 Bold（位图膨胀 1px → 轮廓化），能根治坑 13/14/15 的叠印方案。本机 `fontTools 4.63` 可用。
