# WhyLab API 设计与数据模型（MVP）

- 版本：V0.3（采用界面设计稿，补充其所需接口与字段）
- 状态：健康检查、提问、学习空间、对话与消息已实现（标 ✅）；其余为设计草案。前端对未实现接口的调用集中在 `client/src/api/*.ts`，当前返回模拟数据
- 约定：所有接口以 `/api` 为前缀，请求与响应均为 `application/json; charset=utf-8`

> 设计意图：**先把对话、知识节点、复习任务与复习历史的关系定下来，再写页面。**
> 这样页面开发时改的是 UI，不是表结构。

---

## 1. 统一响应信封

成功：

```json
{ "success": true, "data": { } }
```

失败：

```json
{ "success": false, "error": { "code": "INVALID_QUESTION", "message": "问题不能为空，请先输入想弄明白的内容。" } }
```

- HTTP 状态码表达类别，`error.code` 表达可判定的原因，`error.message` 只用于直接展示给用户。
- 前端解析集中在 `client/src/api/http.ts`，页面与 store 只处理 `data` 或 `ApiError`。
- 时间字段统一为 ISO 8601 UTC 字符串（`new Date().toISOString()`）。

### 错误码表

| code | HTTP | 含义 |
| --- | --- | --- |
| `INVALID_QUESTION` | 400 | 问题为空或不是字符串 |
| `QUESTION_TOO_LONG` | 400 | 超过 2000 字符 |
| `VALIDATION_ERROR` | 400 | 其他字段校验失败 |
| `NOT_FOUND` | 404 | 路由或资源不存在 |
| `AI_UNAVAILABLE` | 502 | 模型服务不可用或超时 |
| `AI_INVALID_OUTPUT` | 502 | 模型输出不符合结构约定（重试后仍失败） |
| `ROUND_NOT_ACTIVE` | 409 | 追问模式下没有进行中的追问轮次 |
| `UNAUTHORIZED` | 401 | 未认证 / 无权访问该资源 |
| `INTERNAL_ERROR` | 500 | 未预期异常（细节只进服务端日志） |

---

## 2. 已实现接口

### 2.1 健康检查

`GET /api/health`

```json
{
  "success": true,
  "message": "WhyLab API is running",
  "data": { "status": "ok", "uptimeSeconds": 12, "timestamp": "2026-10-27T10:59:29.921Z" }
}
```

用途：验证 Express 已启动、路由可达；前端首页状态区据此显示"已连接 / 未连接"。

### 2.2 提问（当前为模拟响应）

`POST /api/chat`

请求：

```json
{ "question": "为什么闭包能访问外部函数的变量？" }
```

响应：

```json
{
  "success": true,
  "data": {
    "question": "为什么闭包能访问外部函数的变量？",
    "answer": "……",
    "isMock": true,
    "followUpSuggestions": ["这个结论依赖哪些前提？……"]
  }
}
```

- `question`：字符串，trim 后非空，长度 ≤ 2000。
- `isMock`：**契约的一部分**。只要后端没有真正调用模型，就必须为 `true`，前端据此显示"模拟响应"标记，避免把占位文本当成 AI 解释。
- 该接口的返回结构在接入真实模型后保持不变，仅 `answer` 与 `isMock` 的取值变化。

---

## 3. 业务接口（按实现顺序；✅ = 已实现并有测试）

### 3.1 学习空间

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/spaces` | ✅ 创建学习空间 `{ title, description? }`（标题 ≤ 100 字） |
| `GET` | `/api/spaces` | ✅ 列表（按 `updated_at` 倒序；有新消息的空间排到最前） |
| `GET` | `/api/spaces/:id` | ✅ 详情（节点数、待复习数待节点与复习接口完成后补上） |
| `PATCH` | `/api/spaces/:id` | 改标题/描述 |
| `DELETE` | `/api/spaces/:id` | ✅ 级联删除对话、消息、追问轮次（之后再加节点、复习任务） |

### 3.2 对话与消息（含双追问模式）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/spaces/:spaceId/conversations` | ✅ 新建对话 `{ title?, mode? }`，`mode` 默认 `explain` |
| `GET` | `/api/spaces/:spaceId/conversations` | ✅ 对话列表（按 `updated_at` 倒序） |
| `GET` | `/api/conversations/:id` | ✅ 对话详情 |
| `PATCH` | `/api/conversations/:id` | ✅ 改标题或切换模式 `{ title?, mode?: 'explain' \| 'socratic' }` |
| `DELETE` | `/api/conversations/:id` | ✅ 删除对话及其消息、追问轮次 |
| `GET` | `/api/conversations/:id/messages` | ✅ 消息列表（`?limit=`，默认且最多 200 条，按发送顺序），每条带 `mode`、`kind`、`meta` |
| `POST` | `/api/conversations/:id/messages` | ✅ 发送一条消息，按对话当前 `mode` 生成回复（当前两种模式都是 mock 回复） |
| `POST` | `/api/conversations/:id/restatements` | 解释后"用一句话复述" `{ content }`：写一条 `kind = restatement` 的消息，同时建 `understanding` 节点（`source_message_id` 指向这条消息），并作为档案证据 |
| `POST` | `/api/conversations/:id/hints` | 追问模式的三级提示 `{ level: 1 \| 2 \| 3 }`，分别对应 `nudge` / `hint` / `reveal`；只能按顺序解锁，记录"在哪一步需要帮助"，不影响评分 |
| `GET` | `/api/conversations/:id/dependencies` | 这个问题依赖的概念：`[{ title, nodeId?, state: 'mastered' \| 'learned' \| 'missing' }]`，`mastered` 来自档案里已确认的 `mastered` 条目 |
| `POST` | `/api/conversations/:id/reveal` | 追问模式下"直接告诉我"：当前步强制 `reveal`（等价于 `hints` 的 `level: 3`，二选一实现） |
| `POST` | `/api/conversations/:id/end` | 结束会话：结束进行中的追问轮次并触发档案提取（异步） |

**解释模式**下 `POST .../messages` 的响应：

```json
{
  "success": true,
  "data": {
    "userMessage": { "id": "…", "mode": "explain", "kind": "question" },
    "reply": { "id": "…", "mode": "explain", "kind": "answer", "content": "……" },
    "followUpSuggestions": ["什么情况下这个结论不成立？"],
    "isMock": false
  }
}
```

**追问模式**下：

- 若没有进行中的轮次，用户这条消息被视为**学习目标**，服务端创建 `socratic_rounds` 记录，AI 回复一个诊断问题（`kind = probe`）。
- 若有进行中的轮次，用户消息为**作答**（`kind = response`），AI 回复以下之一：

| `kind` | 含义 |
| --- | --- |
| `probe` | 继续追问下一层 |
| `nudge` / `hint` / `reveal` | 三级提示，逐级加强 |
| `summary` | 目标达成或达到最大层数，给出本轮小结，轮次结束 |

```json
{
  "success": true,
  "data": {
    "userMessage": { "id": "…", "mode": "socratic", "kind": "response" },
    "reply": { "id": "…", "mode": "socratic", "kind": "probe", "content": "那外部函数执行完后，它的变量去哪了？" },
    "round": { "id": "…", "goal": "弄懂闭包为什么能访问外部变量", "depth": 3, "maxDepth": 6, "status": "active" },
    "assessment": { "correctPoints": ["…"], "gaps": ["…"] },
    "isMock": false
  }
}
```

- `kind = summary` 时 `round.status = completed`，并附 `summary: { userInsights[], stuckAt[], conclusion }`，前端提供"保存为知识节点"。
- `assessment` 只用于界面展示与证据记录，不计分。

上下文策略：取该对话最近 N 条消息（默认 10，可配）+ 进行中轮次的目标与层数 + 相关的已确认思维模式（≤ 5 条）。超出部分后续用摘要压缩，MVP 不做。

流式：`?stream=1` 为 SSE，MVP 稳定后再加，前端先按非流式实现。

### 3.3 知识节点

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/spaces/:spaceId/nodes` | 创建节点 `{ type, title, content, sourceMessageId? }` |
| `GET` | `/api/spaces/:spaceId/nodes?type=&q=` | 列表 + 类型筛选 + 标题/正文搜索 |
| `GET` | `/api/nodes/:id` | 节点详情（含入边/出边） |
| `PATCH` | `/api/nodes/:id` | 编辑标题/正文 |
| `DELETE` | `/api/nodes/:id` | 删除节点及其边；关联复习任务转 `paused`（见 §5.3） |
| `POST` | `/api/nodes/:id/edges` | 建立关系 `{ targetNodeId, relationType }` |
| `DELETE` | `/api/edges/:id` | 删除关系 |

`type` 枚举：`question` | `explanation` | `understanding`
`relationType` 枚举：`answers` | `depends_on` | `related_to` | `contradicts` | `extends`

> 这些关系只用于组织个人学习路径，不等同于经过验证的学科知识图谱。

知识节点补充（V0.3）：

- 列表增加过滤 `missingUnderstanding=1`：只返回还没有挂 `understanding` 节点的问题（知识库"只看还没写理解的"）。
- `GET /api/nodes/:id` 返回 `dependsOn[]: { nodeId, title, mastered }`。`mastered` 由依赖节点标题与档案中 `status = confirmed` 且 `category = mastered` 的条目关联得出（按 `topic` 匹配），用于"依赖：词法作用域（你已能讲清）"。

### 3.4 复习

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/nodes/:id/review-items` | 从节点创建复习任务（`prompt` + `referenceAnswer` 可由 AI 生成后人工确认） |
| `GET` | `/api/review/queue` | 到期任务（`due_at <= now` 且 `status = active`） |
| `GET` | `/api/review-items/:id` | 任务详情（作答前**不得**返回 `reference_answer`） |
| `GET` | `/api/review-items/:id/interval-preview` | 四个评分各自的下次间隔 `{ again, hard, good, easy }`（天），复用 §5 的调度纯函数，不写库 |
| `POST` | `/api/review-items/:id/attempts` | 提交回答 `{ answer, confidence?: 'low' \| 'medium' \| 'high' }`，返回反馈并推进调度 |
| `GET` | `/api/review-items/:id/attempts` | 历史回答与反馈 |

作答前隐藏参考答案是安全要求而非 UI 偏好：详情接口要把 `reference_answer` 从响应中剔除，只在 `POST attempts` 的服务端内部使用。

`POST attempts` 的响应（V0.3）：

```json
{
  "success": true,
  "data": {
    "correctPoints": ["…"],
    "missingPoints": ["…"],
    "misconceptions": ["…"],
    "suggestedPerformance": "hard",
    "matchedPatterns": [
      { "patternId": "…", "statement": "…", "excerpt": "变量存在函数里面" }
    ],
    "referenceAnswer": "……",
    "isMock": false
  }
}
```

- `suggestedPerformance` 显示为"WhyLab 的看法：勉强"，只是建议，用户自己的评分才进入调度。
- `matchedPatterns`：这次作答命中的**已确认**档案条目，前端显示为"这个说法你之前也用过"。没有命中时为空数组。
- `confidence = high` 且最终评分为 `again` 的作答，是 `misconception` 的强证据（"自信但答错"）。
- 参考答案只在提交之后返回。

`POST attempts` 完成后同样异步触发档案提取（以该次作答为证据）。

### 3.5 思维档案

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/profile/patterns?status=&category=` | 档案列表（默认 `proposed` + `confirmed`） |
| `GET` | `/api/profile/patterns/:id` | 详情 + 证据列表（片段 + 来源跳转） |
| `PATCH` | `/api/profile/patterns/:id` | 编辑描述，或改状态 `{ status: 'confirmed' \| 'rejected' }` |
| `DELETE` | `/api/profile/patterns/:id` | 删除模式及其证据 |
| `DELETE` | `/api/profile` | 清空整个档案（只删模式与证据） |
| `PATCH` | `/api/profile/settings` | `{ enabled: boolean }` 暂停/恢复档案记录 |

`category` 枚举：`questioning` | `misconception` | `reasoning_gap` | `effective_strategy` | `mastered`
`status` 枚举：`proposed` | `confirmed` | `rejected` | `archived`

### 3.6 今日汇总（V0.3）

`GET /api/today`：首页一次取齐。

```json
{
  "success": true,
  "data": {
    "displayName": "安娜",
    "reviewDue": 6,
    "reviewDone": 0,
    "reviewMinutes": 12,
    "reviewPreview": [{ "id": "…", "prompt": "…", "lastPerformance": "hard" }],
    "openRound": {
      "conversationId": "…", "spaceId": "…", "goal": "…",
      "depth": 3, "maxDepth": 6, "waitingQuestion": "…", "updatedAt": "…"
    },
    "noticed": { "id": "…", "category": "questioning", "statement": "…", "evidenceCount": 3 }
  }
}
```

- `displayName` 来自 `users.display_name`，为空时前端只显示"晚上好。"。
- `openRound`：最近一个 `status = active` 的追问轮次，没有则为 `null`。
- `noticed`：一条最新的 `proposed` 档案条目，没有则为 `null`；档案暂停时始终为 `null`。
- `reviewMinutes` 按待回忆数粗估（每题约 2 分钟），只用于提示。

---

## 4. 核心数据模型（SQLite）

以下为逻辑模型，落地时按 SQLite 类型收敛（`TEXT` / `INTEGER` / `REAL`），主键统一用 `TEXT` 存 UUID。

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  display_name  TEXT,                           -- 首页问候用（V0.3，迁移 002）
  profile_enabled INTEGER NOT NULL DEFAULT 1,   -- 思维档案开关
  created_at    TEXT NOT NULL
);

CREATE TABLE learning_spaces (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE conversations (
  id            TEXT PRIMARY KEY,
  space_id      TEXT NOT NULL REFERENCES learning_spaces(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  mode          TEXT NOT NULL DEFAULT 'explain' CHECK (mode IN ('explain','socratic')),
  ended_at      TEXT,                           -- 会话结束时间，触发档案提取
  profiled_at   TEXT,                           -- 已完成档案提取的时间，防重复
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- 追问模式的一轮：一个学习目标 → 若干层追问 → 小结
CREATE TABLE socratic_rounds (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  goal            TEXT NOT NULL,
  depth           INTEGER NOT NULL DEFAULT 0,
  max_depth       INTEGER NOT NULL DEFAULT 6,
  hint_level      INTEGER NOT NULL DEFAULT 0,   -- 当前层已给到的提示级别 0..3
  status          TEXT NOT NULL CHECK (status IN ('active','completed','abandoned')),
  summary_json    TEXT,                         -- { userInsights[], stuckAt[], conclusion }
  started_at      TEXT NOT NULL,
  ended_at        TEXT
);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  mode            TEXT NOT NULL CHECK (mode IN ('explain','socratic')),
  kind            TEXT NOT NULL CHECK (kind IN (
                    'question','answer','restatement',           -- 解释模式（restatement = 一句话复述，V0.3）
                    'goal','response','probe',                   -- 追问模式
                    'nudge','hint','reveal','summary')),
  round_id        TEXT REFERENCES socratic_rounds(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  meta_json       TEXT,                           -- 模型结构化输出中非正文部分：followUps / assessment / observations
  created_at      TEXT NOT NULL
);

CREATE TABLE knowledge_nodes (
  id                TEXT PRIMARY KEY,
  space_id          TEXT NOT NULL REFERENCES learning_spaces(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('question','explanation','understanding')),
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,
  source_message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE knowledge_edges (
  id             TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  relation_type  TEXT NOT NULL CHECK (relation_type IN ('answers','depends_on','related_to','contradicts','extends')),
  created_at     TEXT NOT NULL,
  UNIQUE (source_node_id, target_node_id, relation_type)
);

CREATE TABLE review_items (
  id               TEXT PRIMARY KEY,
  node_id          TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  prompt           TEXT NOT NULL,
  reference_answer TEXT NOT NULL,
  due_at           TEXT NOT NULL,
  interval_days    INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL CHECK (status IN ('active','completed','paused')),
  created_at       TEXT NOT NULL
);

CREATE TABLE review_attempts (
  id             TEXT PRIMARY KEY,
  review_item_id TEXT NOT NULL REFERENCES review_items(id) ON DELETE CASCADE,
  user_answer    TEXT NOT NULL,
  confidence     TEXT CHECK (confidence IN ('low','medium','high')),  -- 作答前的把握程度（V0.3）
  feedback       TEXT NOT NULL,                 -- 展示给用户的反馈正文
  correct_points_json  TEXT NOT NULL DEFAULT '[]',
  missing_points_json  TEXT NOT NULL DEFAULT '[]',
  misconceptions_json  TEXT NOT NULL DEFAULT '[]',   -- 思维档案的主要原料
  suggested_performance TEXT CHECK (suggested_performance IN ('again','hard','good','easy')),
  performance    TEXT NOT NULL CHECK (performance IN ('again','hard','good','easy')),
  reviewed_at    TEXT NOT NULL,
  next_due_at    TEXT NOT NULL
);

-- 思维档案：只记录有证据的行为模式
CREATE TABLE learner_patterns (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id        TEXT REFERENCES learning_spaces(id) ON DELETE SET NULL, -- 为空表示跨空间
  category        TEXT NOT NULL CHECK (category IN
                    ('questioning','misconception','reasoning_gap','effective_strategy','mastered')),
  statement       TEXT NOT NULL,                -- 一句话、只描述行为
  topic           TEXT,                         -- 相关主题关键词，用于注入时筛选
  confidence      REAL NOT NULL DEFAULT 0.3 CHECK (confidence BETWEEN 0 AND 1),
  status          TEXT NOT NULL CHECK (status IN ('proposed','confirmed','rejected','archived')),
  evidence_count  INTEGER NOT NULL DEFAULT 0,
  last_seen_at    TEXT NOT NULL,
  confirmed_by    TEXT CHECK (confirmed_by IN ('user','auto')),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE pattern_evidence (
  id            TEXT PRIMARY KEY,
  pattern_id    TEXT NOT NULL REFERENCES learner_patterns(id) ON DELETE CASCADE,
  source_type   TEXT NOT NULL CHECK (source_type IN ('message','review_attempt','socratic_round')),
  source_id     TEXT NOT NULL,                  -- 多态引用，不加外键；来源删除后保留片段
  excerpt       TEXT NOT NULL,                  -- 证据片段（≤ 300 字）
  observed_at   TEXT NOT NULL
);

CREATE INDEX idx_nodes_space     ON knowledge_nodes(space_id, created_at);
CREATE INDEX idx_edges_source    ON knowledge_edges(source_node_id);
CREATE INDEX idx_edges_target    ON knowledge_edges(target_node_id);
CREATE INDEX idx_review_due      ON review_items(status, due_at);
CREATE INDEX idx_attempts_item   ON review_attempts(review_item_id, reviewed_at);
CREATE INDEX idx_messages_conv   ON messages(conversation_id, created_at);
CREATE INDEX idx_rounds_conv     ON socratic_rounds(conversation_id, status);
CREATE INDEX idx_patterns_user   ON learner_patterns(user_id, status, category);
CREATE INDEX idx_evidence_pattern ON pattern_evidence(pattern_id, observed_at);
```

**关键约束**

1. 复习任务与复习记录分表：一个节点会被复习多次，每次回答都必须留痕（用于复盘与改进反馈）。
2. `source_message_id` 用 `ON DELETE SET NULL`：删对话不该毁掉用户已沉淀的知识。
3. 边表加唯一约束，避免重复关系把图变成多重边。
4. 所有时间用 UTC 字符串存储，展示层再转本地时区。
5. 消息的 `mode` 记录**发送时**的模式，切换对话模式不改历史消息。
6. 一个对话同一时刻最多一个 `active` 的追问轮次（服务端保证，写测试）。
7. `pattern_evidence.source_id` 不加外键：用户删除对话后，证据片段仍保留以便解释"为什么有这条模式"；若用户要求彻底删除，走 `DELETE /api/profile`。
8. 结构化字段用 `*_json` 存 JSON 字符串（SQLite 无原生数组），读写统一经数据访问层序列化与校验。

---

## 5. 复习调度（可测试的纯函数）

### 5.1 输入输出

```ts
type Performance = 'again' | 'hard' | 'good' | 'easy'

interface ScheduleInput {
  performance: Performance
  currentIntervalDays: number
  now: Date
}

interface ScheduleResult {
  nextIntervalDays: number
  nextDueAt: Date
}
```

### 5.2 初始规则（MVP 参数，非最优解）

| 表现 | 间隔变化 | 初始值 |
| --- | --- | --- |
| `again` 无法回忆 | 重置为 1 天，建议回看关键解释 | 1 |
| `hard` 勉强回忆 | `max(1, round(i × 1.2))` | 1 |
| `good` 基本完整 | `max(3, round(i × 2.5))` | 3 |
| `easy` 独立且完整 | `max(7, round(i × 3.5))` | 7 |

- 间隔上限 60 天，避免长期不再出现。
- 该函数不调用模型、不读数据库，可被单元测试覆盖；模型只产出"建议等级"，最终等级由用户确认。

### 5.3 边界处理

- 删除节点：任务 `status` 置 `paused` 而非物理删除，保留历史；节点本身物理删除（`ON DELETE CASCADE` 会带走任务，因此删除流程需先把任务置 `paused` 或改为不级联——**落地时必须二选一并写测试**）。
- 重复提交：`POST attempts` 需幂等键（客户端生成 `attemptId`）或前端提交后禁用按钮，二选一。
- 并发：同一任务两次提交，以 `reviewed_at` 较晚者为准，前一条保留为历史。

### 5.4 思维档案规则（纯函数）

与复习调度一样，档案状态变化不交给模型决定：模型只产出"观察"，规则函数决定升级、合并与衰减。

```ts
interface Observation {
  category: PatternCategory
  statement: string
  topic?: string
  excerpt: string
  sourceType: 'message' | 'review_attempt' | 'socratic_round'
  sourceId: string
}

// 把一批观察合并进现有档案，返回要新增/更新的模式与证据
function mergeObservations(existing: Pattern[], obs: Observation[], now: Date): PatternChange[]
// 计算衰减后的权重与是否提示"可能已克服"
function decay(pattern: Pattern, now: Date): { weight: number; suggestArchive: boolean }
// 为一次对话/复习挑选要注入提示词的模式
function selectForPrompt(patterns: Pattern[], topic: string, limit = 5): Pattern[]
```

规则（MVP 参数）：

| 规则 | 值 |
| --- | --- |
| 新观察的初始置信度 | 0.3 |
| 每条新的独立证据 | `confidence = min(1, confidence + 0.2)` |
| 自动确认 | `evidence_count ≥ 3` 且来自 ≥ 2 次不同会话/复习，`confirmed_by = 'auto'` |
| 相似判断 | 同 `category` 且 `statement` 规范化后相似（MVP 用关键词重合度，后续换向量） |
| 驳回的模式 | 相似观察直接丢弃，不再提议 |
| 衰减 | 60 天无新证据，注入权重减半；`misconception` 在其 `topic` 的连续 3 次复习未出现 → `suggestArchive` |
| 注入 | 只选 `confirmed`，按 `topic` 匹配 + 置信度 × 衰减权重排序，最多 5 条 |

---

## 6. 模型输出结构化约定

所有会写库的 AI 输出都必须经过服务端校验后再落库：

| 功能 | 必须字段 | 校验 |
| --- | --- | --- |
| 对话解释 | `answer`, `followUpSuggestions[]`, `observations[]?` | 非空字符串、数组 ≤ 3 |
| 追问回合 | `kind`, `content`, `assessment{correctPoints[], gaps[]}`, `goalReached` | `kind` ∈ `probe/nudge/hint/reveal/summary`；`depth ≥ max_depth` 时服务端强制 `summary` |
| 追问小结 | `userInsights[]`, `stuckAt[]`, `conclusion` | 非空；`userInsights` 尽量引用用户原话 |
| 档案提取 | `observations[]{category, statement, topic?, excerpt, sourceId}` | `category` 属于枚举；`sourceId` 必须是本次输入中的真实 ID；`statement` 不得含能力评价词（服务端黑名单过滤） |
| 知识保存 | `title`, `type`, `content`, `prerequisites[]` | `type` 属于枚举；`prerequisites` 只作建议，不直接建边 |
| 回答反馈 | `correctPoints[]`, `missingPoints[]`, `misconceptions[]`, `suggestedPerformance` | `suggestedPerformance` 属于四级枚举 |

- 校验失败 → 有限次（≤ 2）修复重试 → 仍失败返回 `AI_INVALID_OUTPUT`，绝不把半成品写库。
- 不把模型单次评分当作掌握度结论，只作为调度输入之一。
- 追问模式的提示词要求模型**不得在 `probe` 中给出答案**；服务端对 `probe` 做简单检查（长度上限、必须含问句），不合格按 `AI_INVALID_OUTPUT` 流程重试。
- 档案提取的输入只含本次会话/复习的消息与作答，以及已有模式的摘要（用于避免重复），不发送整个历史。

---

## 7. 下一步实现顺序

1. ✅ **SQLite 接入**（迁移 001、002 已落地）：`server/src/db/` 下建连接与迁移脚本（`better-sqlite3`），先落 `users / learning_spaces / conversations / messages / socratic_rounds`，字段按本版一次到位（`mode`、`kind`、`meta_json`），避免后续迁移。启动时自动创建单用户 `local` 记录。
2. **真实对话 · 解释模式**：`POST /api/conversations/:id/messages` 接 OpenAI 兼容接口，保留 `isMock` 语义（无 key 时仍走 mock）；输出带 `observations`，先写入 `meta_json` 不使用。
3. **追问模式**：同一接口按 `mode` 分派到 `services/socratic.ts`；轮次状态机（goal → probe… → summary）写单元测试；`reveal` 与 `end` 接口。
4. **知识节点**：保存 → 列表 → 编辑 → 删除，含 `knowledge_edges` 与"追问小结保存为节点"。
5. **复习**：调度纯函数 + 单元测试 → `review_items` / `review_attempts`（含结构化反馈字段）→ 回忆界面。
6. **思维档案**：`mergeObservations / decay / selectForPrompt` 纯函数 + 单测 → 提取任务 → `/api/profile` 接口 → 档案页 → 注入三处提示词。
7. **学习记录**：基于真实表做聚合，不造数据。

每步都保持：接口契约先定、测试先补。界面已按设计稿先行实现（V0.3），页面对未实现接口的调用集中在 `client/src/api/*.ts` 并返回模拟数据；某个接口完成后，只替换对应函数的实现。
