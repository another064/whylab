# WhyLab

> 把一次性的 AI 问答，变成「双向追问 → 沉淀知识 → 主动复习」的长期学习过程，并记住每个人的思维方式。

WhyLab 是一个持续追问、持续巩固的学习 agent。它有两种对话模式：**解释模式**（你问 AI 答）和**追问模式**（AI 苏格拉底式地追问你）；它把关键问题沉淀为知识节点、按表现安排复习，并基于可观察的证据建立你的**思维档案**——追问倾向、反复误解、推理断点、对你有效的讲法——让下一次讲解和复习更有针对性。

## 当前进度

| 模块 | 状态 |
| --- | --- |
| 学习空间、对话、消息持久化（SQLite） | ✅ 刷新、重启后数据仍在 |
| 解释模式（你问 AI 答） | ✅ 接入真实模型：结构化回答、上下文、失败重试 |
| 追问模式（AI 问你） | ✅ 轮次状态机、三级提示、"直接告诉我"、自动小结 |
| 前端界面（按设计稿） | ✅ 五个页面、响应式布局、设计变量、通用组件 |
| 主动回忆与复习调度 | ⬜ 页面已做，数据为示例 |
| 知识库（知识节点） | ⬜ 页面已做，数据为示例 |
| 思维档案 | ⬜ 页面已做，数据为示例；模型观察与卡点证据已开始积累 |
| 今日汇总 `GET /api/today` | ⬜ 首页的问候、待回忆数、未完成的追问为示例数据 |

使用示例数据的区域在页面上标有"示例数据"或"模拟响应"。详细需求与验收用例见 [docs/requirements.md](docs/requirements.md)，接口与数据模型见 [docs/api-design.md](docs/api-design.md)。

---

## 技术栈

| 层级 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | Vue 3 + TypeScript + Vite 7 | 组合式 API，`<script setup>`，不依赖 UI 框架 |
| 路由 / 状态 | Vue Router 4 / Pinia 3 | 按领域拆分 store：`workspace`、`inquiry`、`today` |
| 后端 | Node.js + Express 5 + TypeScript | `tsx` 直接运行 TS |
| 数据库 | SQLite（better-sqlite3） | 开启外键与 WAL，启动时自动迁移 |
| AI | 兼容 OpenAI Chat Completions 的接口 | 已用 DeepSeek 验证；未配置时走 mock，并标记 `isMock` |
| 测试 | Vitest + Supertest | 后端 77 个用例，测试中强制使用 mock，不调用真实模型 |
| 工程 | npm workspaces | 一次 `npm install` 安装前后端 |

## 快速开始

要求：Node.js ≥ 20.19（Vite 7 的最低要求），npm ≥ 10。

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

| 服务 | 地址 |
| --- | --- |
| 前端（Vite） | http://localhost:5173 |
| 后端（Express） | http://localhost:3001 |
| 健康检查 | http://localhost:3001/api/health |

前端只请求相对路径 `/api/*`，由 Vite 代理转发到 3001，因此不需要开启 CORS。可用 `API_TARGET` 环境变量覆盖代理目标。

不配置模型也能完整跑通界面：默认 `AI_PROVIDER=mock`，回复会明确标为"模拟响应"。

## 环境变量

复制 `.env.example` 为 `.env` 后修改。`.env` 已被 `.gitignore` 忽略，不会提交。

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `PORT` | `3001` | 后端端口 |
| `DB_PATH` | `data/whylab.db` | SQLite 文件路径（相对仓库根目录），目录不存在会自动创建 |
| `AI_PROVIDER` | `mock` | `mock` 或 `openai-compatible` |
| `AI_BASE_URL` | `https://api.openai.com/v1` | 兼容接口地址，DeepSeek 为 `https://api.deepseek.com` |
| `AI_MODEL` | 空 | 模型名，例如 `deepseek-flash` |
| `AI_API_KEY` | 空 | 密钥，只在服务端读取 |
| `AI_TIMEOUT_MS` | `60000` | 单次模型请求超时（毫秒） |

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 同时启动前后端 |
| `npm run dev:client` / `npm run dev:server` | 单独启动 |
| `npm test` | 后端测试 |
| `npm run type-check` | 前端 `vue-tsc` + 后端 `tsc` |
| `npm run build` | 前端类型检查并产出 `client/dist` |

## 目录结构

```
whylab/
├── client/src/
│   ├── api/            # 请求层；未实现的接口在这里返回示例数据，后端完成后只替换函数实现
│   ├── components/     # 通用组件：MessageBubble、ModeSwitch、DepthBar、HintLadder、
│   │   │               #   ConfidencePicker、RatingButtons、PatternCard、NodeCard、SelectMenu …
│   │   └── motion/     # 动效组件（改写自 Vue Bits，见下文）
│   ├── layouts/        # AppShell（响应式导航）、FocusLayout（专注页）
│   ├── views/          # 今日、探究（inquiry/）、回忆、知识库、我的思维
│   ├── stores/         # Pinia
│   ├── mocks/          # 示例数据
│   └── styles/         # tokens.css（全部设计变量）、base.css
├── server/src/
│   ├── db/             # 连接、迁移（migrations/*.sql）、数据访问层（repositories/）
│   ├── routes/         # spaces、conversations（含 reveal / end）、health
│   ├── services/       # explain（解释模式）、socratic（追问编排）、socratic-round（轮次状态机）、ai/model
│   ├── http/           # 统一错误与参数校验
│   └── config/env.ts
└── docs/               # requirements.md、api-design.md
```

## 接口一览

所有接口以 `/api` 为前缀，返回统一信封 `{ success, data }` 或 `{ success, error: { code, message } }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查 |
| `GET` / `POST` | `/spaces` | 学习空间列表 / 新建 |
| `GET` / `DELETE` | `/spaces/:id` | 详情 / 删除（级联删除对话与消息） |
| `GET` / `POST` | `/spaces/:id/conversations` | 对话列表 / 新建（`mode`：`explain` 或 `socratic`） |
| `GET` / `PATCH` / `DELETE` | `/conversations/:id` | 详情（含当前追问轮次）/ 改标题或切换模式 / 删除 |
| `GET` / `POST` | `/conversations/:id/messages` | 消息列表 / 发送一条消息，按对话模式生成回复 |
| `POST` | `/conversations/:id/reveal` | 追问模式要帮助：`level` 1 方向、2 线索、3 直接告诉我 |
| `POST` | `/conversations/:id/end` | 结束当前追问轮次并生成小结 |

完整约定（响应结构、错误码、追问规则）见 [docs/api-design.md](docs/api-design.md)。

## 两种模式怎么工作

**解释模式**：模型按固定结构输出"一句话结论、推导步骤、前提、不确定之处、追问建议"，服务端校验后才写库；不合格时最多修复重试 2 次。上下文取对话最近 10 条消息。

**追问模式**：一轮从学习目标开始，AI 先问诊断问题（第 1 层），之后每次作答进入下一层，最多 6 层，答完最后一层自动小结。提示分三级，不增加层数；每次要提示都会记一条卡点证据，供以后的思维档案使用。服务端会检查每个追问：必须是问句、不能太长、不能直接说出答案，不合格就重试。

## 设计与动效

- 界面按设计稿实现：薄荷色表示 AI 说的，可可色表示你写的，黑巧色用于正文、主按钮和选中态。所有颜色、字号、圆角、间距只定义在 `client/src/styles/tokens.css`，组件不写死。
- 断点：< 768 底部标签栏；768–1199 左侧导航；≥ 1200 再加右侧栏。回忆页是专注页，不显示导航。
- 动效组件取自或改写自 [Vue Bits](https://vue-bits.dev)（MIT + Commons Clause），去掉了 gsap / motion-v 依赖，每个文件开头注明来源与改动。全部遵守系统的"减少动态效果"设置。注意 Commons Clause 限制出售以该代码为主要价值的产品。

## 隐私与安全

- API Key 只存在于服务端的 `.env`，不进入前端构建产物，也不在仓库中。
- 学习数据存在本地 SQLite 文件（`data/`，已被忽略），不是端到端加密。
- 配置真实模型后，你的问题和回答会发送到该模型服务。
- 思维档案只记录有证据的行为模式，不评价能力；服务端会过滤能力评价类措辞。

## 下一步

按 [docs/requirements.md](docs/requirements.md) §12 的顺序，页面依次接入真实接口：

1. **探究页剩余接口**：复述存为"我的理解"、收进知识库、依赖关系。
2. **回忆**：复习调度纯函数（先写单测）、间隔预览、结构化反馈、作答前的把握程度。
3. **知识库**：知识节点增删改查，"只看还没写理解的"筛选，追问小结保存为节点。
4. **思维档案**：从积累的观察与卡点证据中提取 → 档案页 → 注入提示词。
5. **今日汇总** `GET /api/today`，以及深色模式、空状态的设计。

## 关于开源模板

工程底座**没有**直接 fork 任何候选仓库，而是用官方脚手架（Vite + Vue + Express）重建。要点：

- `ognjenjevremovic/mvp-starter`（MIT）：目录结构与本项目最接近，但依赖停留在 2022 年（Vite 3 / TS 4.7 / Vitest 0.18），且 `src/db` 只是硬编码对象，无数据库逻辑。复用其"单仓 client+server + Vite 代理"的组织思路，代码重写。
- `CHEN-MAJOR/chatAI`（GPL-3.0）：领域最接近（含 SSE 流式与 mock 提供商），但后端是 Fastify、数据库是 MySQL，且 GPL-3.0 的传染性会约束后续分发方式。仅作流式与 mock 设计的参考，未复制代码。
- `ccascio/socratictutor`（MIT）：Next.js + React + Tauri 桌面端，技术栈不符，迁移成本过高。
- `Florent-V/starter-vue-express`（无许可证）：纯 JavaScript + MySQL + AdminJS，且缺少许可证意味着默认不可复用。

## 许可证

本项目自身尚未选择许可证（待定）。注意：若后续引入 GPL-3.0 项目的代码，整个项目需以 GPL-3.0 兼容方式分发。
