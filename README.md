# WhyLab

> 把一次性的 AI 问答，变成「追问原理 → 沉淀知识 → 主动复习」的长期学习过程。

WhyLab 是一款 AI 辅助学习平台。它不只回答问题，还帮助学习者保存关键问题、检验自己是否真正理解，并根据表现安排后续复习。

**当前状态：MVP 第 1 阶段（工程骨架）。** 前后端链路已打通并有自动化测试；数据库、真实模型、知识节点与复习功能尚未实现（设计见 [docs/api-design.md](docs/api-design.md)）。

---

## 技术栈

| 层级 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | Vue 3 + TypeScript + Vite 7 | 组合式 API，`<script setup>` |
| 路由 | Vue Router 4 | 历史模式 |
| 状态 | Pinia 3 | 按领域拆分 store（`health` / `chat`） |
| 后端 | Node.js + Express 5 + TypeScript | `tsx` 直接运行 TS，无编译步骤 |
| 数据库 | SQLite（规划中） | 见 `docs/api-design.md` |
| AI | OpenAI 兼容接口（规划中） | 当前 `AI_PROVIDER=mock`，返回明确标记的模拟内容 |
| 测试 | Vitest + Supertest | 后端 6 个用例 |
| 工程 | npm workspaces | 一次 `npm install` 安装前后端 |

## 目录结构

```
whylab/
├── client/                     # Vue 3 前端
│   ├── public/favicon.svg
│   └── src/
│       ├── api/                # 统一请求层 + 按资源拆分的接口
│       │   ├── http.ts         # 信封解包、ApiError
│       │   ├── health.ts
│       │   └── chat.ts
│       ├── components/         # AskPanel（提问）、BackendStatus（连接状态）
│       ├── views/              # HomeView
│       ├── stores/             # Pinia：health、chat
│       ├── router/             # 路由表
│       ├── assets/main.css     # 全局样式（无 UI 框架依赖）
│       ├── App.vue
│       └── main.ts
├── server/                     # Express 后端
│   ├── src/
│   │   ├── routes/             # health.ts、chat.ts
│   │   ├── middleware/         # 404 与兜底错误处理
│   │   ├── config/env.ts       # 环境变量读取与校验
│   │   ├── app.ts              # 组装应用（导出给测试用）
│   │   ├── server.ts           # 监听端口
│   │   └── app.test.ts         # Supertest 集成测试
│   └── vitest.config.ts
├── docs/
│   ├── requirements.md         # 需求摘要与 MVP 范围
│   └── api-design.md           # 接口约定、数据模型、复习调度
├── .env.example
├── package.json                # workspaces + 统一脚本
└── README.md
```

## 快速开始

要求：Node.js ≥ 20.19（Vite 7 的最低要求），npm ≥ 10。

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

启动后：

| 服务 | 地址 |
| --- | --- |
| 前端（Vite） | http://localhost:5173 |
| 后端（Express） | http://localhost:3001 |
| 健康检查 | http://localhost:3001/api/health |

前端只请求相对路径 `/api/*`，由 Vite 代理转发到 3001，因此**不需要开启 CORS**，也不会把后端地址写死在代码里。可用 `API_TARGET` 环境变量覆盖代理目标。

## 常用脚本

在仓库根目录执行：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 同时启动前后端 |
| `npm run dev:client` / `npm run dev:server` | 单独启动 |
| `npm test` | 后端测试（Vitest + Supertest） |
| `npm run type-check` | 前端 `vue-tsc` + 后端 `tsc` |
| `npm run build` | 前端类型检查并产出 `client/dist` |

## 已完成的接口

### `GET /api/health`

```json
{
  "success": true,
  "message": "WhyLab API is running",
  "data": { "status": "ok", "uptimeSeconds": 1, "timestamp": "2026-10-27T10:59:29.921Z" }
}
```

### `POST /api/chat`

```json
{ "question": "为什么闭包能访问外部函数的变量？" }
```

返回 `{ success, data: { question, answer, isMock, followUpSuggestions } }`。
**当前 `isMock` 恒为 `true`**：后端不调用任何模型，只回显占位说明；前端据此显示"模拟响应"标记。接入真实模型后该字段变为 `false`，接口结构不变。

参数校验：`question` 必须为非空字符串，长度 ≤ 2000，否则返回 `400` + `error.code`（`INVALID_QUESTION` / `QUESTION_TOO_LONG`）。

## 环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `PORT` | `3001` | 后端监听端口 |
| `AI_PROVIDER` | `mock` | `mock` 或 `openai-compatible` |
| `AI_BASE_URL` | `https://api.openai.com/v1` | 兼容接口地址 |
| `AI_MODEL` | 空 | 模型名 |
| `AI_API_KEY` | 空 | 密钥，**只读于服务端** |

`.env` 已被 `.gitignore` 忽略；仓库只提交 `.env.example`。前端代码不读取任何 `AI_*` 变量——浏览器里没有密钥，请求一律经后端转发。

## 界面设计基线

页面不依赖任何 UI 框架，样式集中在 `client/src/assets/main.css`，用一套 CSS 变量驱动。规则来自 [taste-skill](https://github.com/Leonxlnx/taste-skill)（MIT）的设计原则，但其 React/Tailwind/Framer Motion 实现方式不适用于本项目，因此只采纳约束、代码全部重写。

| 维度 | 本项目采用的做法 |
| --- | --- |
| 布局 | 非对称双栏（主面板 1.78fr / 侧栏 0.82fr），Hero 左文案 + 右侧数据栏；<94dvh 断点下强制回落单列 |
| 层级 | 靠字重、留白与 1px 细线表达层级，不用"三张等宽卡片"堆叠；闭环用分隔线列表 |
| 颜色 | 单一强调色 teal `#0e6a5e`，中性底色偏冷灰，无霓虹外发光、无渐变文字、不用纯黑 |
| 字体 | 系统无衬线 + 等宽数字（`tabular-nums`），数字与代码用 mono，正文限宽 65ch |
| 动效 | 仅 `transform` / `opacity`，统一 `cubic-bezier(.16,1,.3,1)`，错峰 85ms 入场；`prefers-reduced-motion` 全量降级 |
| 状态 | 加载用等高骨架屏（非转圈）、空态用排版说明、错误就近内联不弹窗、按钮按下位移 1px |
| 可读性 | 焦点环 `:focus-visible`、`aria-live` 播报回答、`sr-only` 补充加载文案 |

改主题只需调 `:root` 里的 `--accent`、`--paper`、`--ink` 等变量，组件不必改动。



- API Key 仅存在于服务端进程环境变量，不进入前端构建产物。
- 学习数据目前**不落库**，刷新即丢失；SQLite 接入后才会持久化。
- 接入云端模型后，问题内容会发送到该服务；切换 `AI_PROVIDER` 前请先确认这一点。
- 本地数据库文件不等于端到端加密。

## 验证记录

在本机（Windows，Node v24.12.0，npm 11.6.2）实际执行：

| 检查 | 结果 |
| --- | --- |
| `npm test` | ✅ 6 tests passed（health 结构、JSON 响应、chat 成功、空问题 400、超长 400、404 JSON） |
| `npm run type-check` | ✅ client `vue-tsc` 与 server `tsc` 均无错误 |
| `npm run build` | ✅ 45 modules transformed，产出 `client/dist` |
| `GET /api/health` 直连 | ✅ 200，结构符合约定 |
| `GET http://localhost:5173/api/health`（代理） | ✅ 200，与直连一致 |
| 前端首页 | ✅ 200，`<title>WhyLab …>` 正常 |
| Vite 模块转换 | ✅ `/src/main.ts`、`HomeView.vue` 均正常返回 |
| `POST /api/chat` 空问题 | ✅ 400 |
| `POST /api/chat` 合法问题 | ✅ 200，`isMock: true` |
| 视觉：桌面 1280px | ✅ 无头 Chrome 截图核对：无溢出、层级正确 |
| 视觉：390 / 430px 视口 | ✅ 用 iframe 压到真实视口宽度截图，单列回落正常、无横向滚动 |
| 视觉：加载 / 结果态 | ✅ 骨架屏、模拟响应标记、追问列表渲染正常 |
| `prefers-reduced-motion` | ✅ 动画全量降级后内容仍完整可见 |

**未验证**：浏览器内的真实点击与输入（无浏览器自动化驱动，仅静态渲染 + 模拟状态截图）。键盘操作、移动端触摸行为需要你手动确认。

### 本机环境注意事项

本机沙箱禁止子进程管道，导致 `esbuild` 的 postinstall 与运行期 `spawn` 报 `EPERM`。采用：

```bash
npm install --cache .npm-cache --ignore-scripts
```

若在普通环境安装失败，可直接 `npm install`（无需上述参数）。运行 `npm run dev` / `npm test` / `npm run build` 时若遇到同样的 `spawn EPERM`，说明当前处于受限沙箱，需要在允许子进程的环境中执行。

## 下一步

按依赖顺序（详见 `docs/api-design.md` §7）：

1. **SQLite 持久化**：连接 + 迁移 + `users / spaces / conversations / messages` 四张表，先让对话可存可读。
2. **真实模型对话**：接 OpenAI 兼容接口，保留 mock 兜底与 `isMock` 语义。
3. **知识节点**：保存 / 列表 / 编辑 / 删除 + 关系边。
4. **主动回忆与复习调度**：调度纯函数先写单元测试，再做 `review_items` / `review_attempts` 与作答界面。
5. **学习记录**：基于真实表聚合。

## 关于开源模板

工程底座**没有**直接 fork 任何候选仓库，而是用官方脚手架（Vite + Vue + Express）重建。原因与逐仓库对比见本仓库提交说明；要点：

- `ognjenjevremovic/mvp-starter`（MIT）：目录结构与本项目最接近，但依赖停留在 2022 年（Vite 3 / TS 4.7 / Vitest 0.18），且 `src/db` 只是硬编码对象，无数据库逻辑。复用其"单仓 client+server + Vite 代理"的组织思路，代码重写。
- `CHEN-MAJOR/chatAI`（GPL-3.0）：领域最接近（含 SSE 流式与 mock 提供商），但后端是 Fastify、数据库是 MySQL，且 GPL-3.0 的传染性会约束后续分发方式。仅作流式与 mock 设计的参考，未复制代码。
- `ccascio/socratictutor`（MIT）：Next.js + React + Tauri 桌面端，技术栈不符，迁移成本过高。
- `Florent-V/starter-vue-express`（无许可证）：纯 JavaScript + MySQL + AdminJS，且缺少许可证意味着默认不可复用。

## 许可证

本项目自身尚未选择许可证（待定）。注意：若后续引入 GPL-3.0 项目的代码，整个项目需以 GPL-3.0 兼容方式分发。
