<div align="center">

# dsh-skin-win2000

**给 DeepSeek Harness Web GUI 换上一身 Windows Server 2003 的皮。**

经典中性灰控件、双色渐变标题栏、1px 立体浮雕、绝对直角、16px 经典滚动条。

[![DSH plugin](https://img.shields.io/badge/DSH-client--plugin-0A246A?style=flat-square)](#安装)
[![platform](https://img.shields.io/badge/platform-web%20GUI-316AC5?style=flat-square)](#安装)
[![no build](https://img.shields.io/badge/build-none-D4D0C8?style=flat-square)](#开发)
[![license](https://img.shields.io/badge/license-MIT-808080?style=flat-square)](#许可)

**简体中文** · [English](README.en.md)

</div>

---

## 界面预览

### 整体界面 —— 灰底、深蓝选中、右下角皮肤面板

![主界面](docs/screenshots/01-main-window.png)

### 经典窗口 —— 渐变标题栏、菜单栏、凹陷输入框与状态栏

![经典窗口](docs/screenshots/02-classic-window.png)

### 设置界面 —— 表单控件、开关与列表上的皮肤

![设置界面](docs/screenshots/03-settings.png)

---

## 这是什么

一个 DSH（DeepSeek Harness）的**客户端插件**，把 Web GUI 的画布整体换成 Windows Server 2003 的视觉语言。装上即生效，右下角会出现一个可拖动、可折叠的控制面板；点一下就能关掉皮肤，界面立刻恢复 DSH 原样。

它不做"大概像那个年代"，而是**按度量表逐项取值**：控件表面、标题栏两端的渐变色、失焦渐变色、三级投影灰、选中高亮——每一项都能在那个年代的 System Metrics 表里找到对应行。仓库里的 `verify-metrics.mjs` 会拿代码里的实际取值去比对这张表，对不上就报错。

## 特性

- **度量表级配色** —— 控件表面 `#D4D0C8`、活动标题栏 `#0A246A → #A6CAF0`、失焦标题栏 `#808080 → #C0C0C0`、投影三级 `#F5F5F5 / #808080 / #404040`、选中高亮 `#0A246A`
- **绝对直角** —— 全表 `border-radius` 归零，并把 6 个 `--dsw-radius-*` token 直接压成 `0px`。DSH 各组件里 394 处圆角都读这几个 token，所以这是从源头掐断，不靠逐个追选择器
- **1px 立体浮雕** —— 所有凸起/凹陷都是阶梯式 `inset box-shadow`：按钮凸起、输入框与代码块凹陷、按下换成凹陷并位移 1px
- **无纯白** —— 度量表里的 `#FFFFFF`（ButtonHighlight）换成 `#F5F5F5`，工作区白底换成 `#D4D0C8`。整个皮肤不含任何纯白像素
- **16px 直角滚动条** —— 灰槽 + 白点阵纹 + 凸起滑块，滑块按下变凹陷
- **停止生成是红的** —— 发送与停止共用同一个按钮类，皮肤按 `aria-label` 精确区分，暂停时是大红底 `#CC0000`
- **皮肤面板** —— 右下角，标题栏可拖动（位置记忆）、可折叠、开关皮肤、切换配色、弹出经典窗口示例
- **不动你的字体** —— 皮肤自身没有任何 `font-family` 覆盖（唯一例外是窗口标题按钮的 Marlett 符号字形），字号、字体完全由你的 DSH 字体设置决定
- **零构建** —— 纯 JavaScript，单文件实现，改完刷新即生效

## 安装

皮肤是一个标准的 DSH 组合包（bundle）：包里有 `dsh.bundle.patch` 指向 `cordis.patch.yml`，有 `dsh.client` 声明浏览器半侧。DSH 的插件管理器接受**包名、Git 地址、压缩包或本地路径**四种来源，所以下面三种装法任选。

**方式一：Git 仓库（无需 npm 账号）**

```bash
dsh plugin --profile web add github:lildanger/dsh-skin-win2000
```

仓库需要是公开的，且**仓库根就是包本体**（根目录下能读到 `package.json` 里的 `dsh.bundle.patch`）。

**方式二：npm 包（市场可索引）**

```bash
# 发布方
npm publish

# 使用方
dsh plugin --profile web add dsh-skin-win2000
```

**方式三：本地路径（开发用）**

```bash
dsh plugin --profile web add link:/path/to/dsh-skin-win2000
```

### 装完还要做一步

如果包**不是**作为 bundle 层被自动加载（例如用了 `link:` 或手动拷贝），需要在你 profile 的 `cordis.patch.yml` 里插入一行：

```yaml
- insert:
    - id: skin-win2000
      name: dsh-skin-win2000
```

图形界面里也可以走「侧栏 → 插件 → 添加插件」，把上面的包名或 Git 地址填进去，装完点**立即启用**。

刷新页面即可。**如果界面没变化，请 `Ctrl+Shift+R` 强制刷新** —— 客户端 bundle 带一年强缓存，普通刷新拿不到新版本。

### 关于字体

皮肤**自带**它渲染文字用的点阵字体：`fonts/unsciiCJKV18.otf`（6.37 MB）随包分发，由宿主半侧在 `/api/dsh-skin-win2000/fonts/unsciiCJKV18.otf` 提供。

- `@font-face` **不写 `local()`**，所以机器上装了什么字体都不会抢先——每台机器渲染结果一致
- 只声明这一个字体族，字体栈为 `"unsciiCJKV18", monospace`，不再引用包里没有的字体
- 响应带 `cache-control: public, max-age=604800, immutable`，浏览器每周最多下载一次；`font-display: swap` 保证字体到达前文字可见
- 字体许可状态见 [fonts/README.md](fonts/README.md)：该字体的再分发条款**没有任何地方写明**，上游 `viznut/unscii` 也未声明许可证。如需替换或移除，该文件里写了做法

皮肤其余部分**不设置字体**：唯一例外是窗口标题按钮的 Marlett 符号字形。如果你关掉面板里的「点阵字体」开关，界面就完全用你自己的字体设置。

## 使用

右下角面板：

| 控件 | 作用 |
|---|---|
| 标题栏 | 按住即可拖动整个面板，位置记在 localStorage；**双击**回到右下角 |
| 右上角按钮 | **三档循环**：完整面板 → 只剩标题栏 → 一个小 ＋ → 回到完整面板 |
| 启用皮肤 | 开关皮肤。关掉后界面恢复 DSH 原样，面板本身仍保持 2003 外观，方便随时开回来 |
| 点阵字体 | 开关随包分发的点阵字体；关掉就用你自己的字体设置 |
| 窗口示例 | 弹出一个完整复刻的经典对话框：标题栏 + 三个标题按钮 + 菜单栏 + 凹陷客户区 + 三段状态栏 + 操作按钮行，点标题栏的 `×` 可看失焦渐变 |

最小档那个小 ＋ 本身也能拖动 —— 它是收起来之后唯一还能抓的地方。拖它不会误触发展开。

## 配色表

| 界面元素 | 取值 | 落地 token |
|---|---|---|
| 3D 控件表面 / 任务栏 / 菜单栏 | `#D4D0C8` | `--dsw-alias-bg-base` |
| 活动标题栏 起点 → 终点 | `#0A246A` → `#A6CAF0` | `--dsh-skin-titlebar-active` |
| 失焦标题栏 起点 → 终点 | `#808080` → `#C0C0C0` | `--dsh-skin-titlebar-inactive` |
| 3D 高光 | `#F5F5F5` | `--dsh-skin-shadow-raised` |
| 3D 投影 | `#808080` | 同上 |
| 最深投影 | `#404040` | `--dsw-alias-border-l4` |
| 选中高亮 | `#0A246A` | `--dsw-specific-sidebar-nav-item-active` |
| 主按钮 | `#003C74`，悬停 `#316AC5` | `--dsw-alias-button-primary-fill` |
| 停止生成 | `#CC0000` | `aria-label` 命中 |
| 代码块 | `#C8C4BC` / 标题条 `#BFBBB2` | `--dsw-alias-markdown-code-block` |
| 提示气泡 | 底 `#FFFFE1` 字 `#000000` | `--dsw-alias-tooltip-bg` |

## 验证

仓库自带两个可执行检查，不需要浏览器：

```bash
node check.mjs           # 规范值、样式表、面板与窗口交互、dispose 清理
node verify-metrics.mjs  # 对照 Windows Server 2003 度量表，纯白必须为 0
```

`check.mjs` 用桩件（module loader / React / DOM）把插件跑一遍，覆盖：SPEC 常量逐值、三态立体阴影、标题栏双向渐变、11px 字号、无字体接管、radius 全归零、滚动条直角、面板与窗口规则、气泡配色、投影三属性、面板折叠与开关、窗口示例的标题栏/菜单/状态栏/操作按钮，以及卸载后的清理。

## 已知限制

- **依赖部分类名** —— 少数规则用 `[class*="bubble"]`、`[class*="_card"]` 这类前缀匹配组件库的 CSS-module 类名。DSH 升级后若命名变化，这些规则会静默失效（症状：气泡或卡片配色回到默认）。
- **`--dsw-static-*` 静态色阶被重写过** —— 不是 DSH 原值。若有组件把"静态最亮档"当文字色用（提示气泡就是例证），可能得到浅底浅字；皮肤已为气泡单独指定文字色。
- **11px 是全局字号** —— 这是度量表的一部分，正文与代码块一起降到 11px。
- **`-webkit-font-smoothing: none` 在 Windows 的 Chromium 上不生效**，写了但改变不了渲染。
- **直角是通杀的** —— 头像、状态圆点、开关滑块都会变方。需要保留圆形的话，从 `border-radius:0 !important` 的选择器里排除即可。
- **截图是实拍** —— 仓库里的三张 PNG 由 `tools/capture.mjs` 通过 Chrome DevTools Protocol 抓取运行中的界面，皮肤状态为 `data-dsh-skin="win2000"`。抓图环境使用你本机的点阵字体与配色设置，所以字体观感会与你的设置一致。

## 开发

```
dsh-skin-win2000/            ← 仓库根就是包本体
├── client.js                全部实现（单文件，零构建）
├── index.js                 宿主半占位（export function apply() {}）
├── package.json             插件清单：exports / dsh.bundle / dsh.client
├── cordis.patch.yml         bundle 层补丁
├── check.mjs                最小可运行检查
├── verify-metrics.mjs       度量表配色回归
├── tools/capture.mjs        通过 CDP 抓取运行中界面的真实截图
├── fonts/unsciiCJKV18.otf     随包分发的点阵字体（6.37 MB）
├── docs/screenshots/        README 用的三张实拍 PNG
├── HANDOFF.md               交接文档：结构、行号、踩坑记录
├── README.en.md             英文版说明
└── workspace/               本地脚本与锁文件（不随包发布）
```

`HANDOFF.md` 里记着 9 条踩坑（`:where()` 特异性归零、模板字面量被反引号提前闭合、bundle 强缓存、面板样式挂在皮肤属性下导致关皮肤时自己塌掉、`background-color !important` 压过主按钮简写……），改代码前值得先看一眼。

## 许可

MIT
