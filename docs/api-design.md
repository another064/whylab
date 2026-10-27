# WhyLab API 设计与数据模型（MVP）

- 版本：V0.1
- 状态：第 1 阶段接口已实现，其余为设计草案
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

## 3. 计划中的接口（按实现顺序）

### 3.1 学习空间

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/spaces` | 创建学习空间 `{ title, description? }` |
| `GET` | `/api/spaces` | 列表（按 `updated_at` 倒序） |
| `GET` | `/api/spaces/:id` | 详情 + 节点数 + 待复习数 |
| `PATCH` | `/api/spaces/:id` | 改标题/描述 |
| `DELETE` | `/api/spaces/:id` | 级联删除对话、节点、复习任务 |

### 3.2 对话与消息

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/spaces/:spaceId/conversations` | 新建对话 |
| `GET` | `/api/spaces/:spaceId/conversations` | 对话列表 |
| `GET` | `/api/conversations/:id/messages` | 消息列表（分页） |
| `POST` | `/api/conversations/:id/messages` | 提问并生成回答 |

`POST .../messages` 的两种模式：

- 默认：返回完整回答（`{ message, answer, followUpSuggestions }`），实现简单，先落地。
- `?stream=1`：SSE 流式返回，MVP 稳定后再加，前端先按非流式实现。

上下文策略：取该对话最近 N 条消息（默认 10，可配）作为 `messages` 传给模型；超出部分后续用摘要压缩，MVP 不做。

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

### 3.4 复习

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/nodes/:id/review-items` | 从节点创建复习任务（`prompt` + `referenceAnswer` 可由 AI 生成后人工确认） |
| `GET` | `/api/review/queue` | 到期任务（`due_at <= now` 且 `status = active`） |
| `GET` | `/api/review-items/:id` | 任务详情（作答前**不得**返回 `reference_answer`） |
| `POST` | `/api/review-items/:id/attempts` | 提交回答，返回反馈并推进调度 |
| `GET` | `/api/review-items/:id/attempts` | 历史回答与反馈 |

作答前隐藏参考答案是安全要求而非 UI 偏好：详情接口要把 `reference_answer` 从响应中剔除，只在 `POST attempts` 的服务端内部使用。

---

## 4. 核心数据模型（SQLite）

以下为逻辑模型，落地时按 SQLite 类型收敛（`TEXT` / `INTEGER` / `REAL`），主键统一用 `TEXT` 存 UUID。

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
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
  created_at    TEXT NOT NULL
);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
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
  feedback       TEXT NOT NULL,
  performance    TEXT NOT NULL CHECK (performance IN ('again','hard','good','easy')),
  reviewed_at    TEXT NOT NULL,
  next_due_at    TEXT NOT NULL
);

CREATE INDEX idx_nodes_space     ON knowledge_nodes(space_id, created_at);
CREATE INDEX idx_edges_source    ON knowledge_edges(source_node_id);
CREATE INDEX idx_edges_target    ON knowledge_edges(target_node_id);
CREATE INDEX idx_review_due      ON review_items(status, due_at);
CREATE INDEX idx_attempts_item   ON review_attempts(review_item_id, reviewed_at);
```

**关键约束**

1. 复习任务与复习记录分表：一个节点会被复习多次，每次回答都必须留痕（用于复盘与改进反馈）。
2. `source_message_id` 用 `ON DELETE SET NULL`：删对话不该毁掉用户已沉淀的知识。
3. 边表加唯一约束，避免重复关系把图变成多重边。
4. 所有时间用 UTC 字符串存储，展示层再转本地时区。

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

---

## 6. 模型输出结构化约定

所有会写库的 AI 输出都必须经过服务端校验后再落库：

| 功能 | 必须字段 | 校验 |
| --- | --- | --- |
| 对话解释 | `answer`, `followUpSuggestions[]` | 非空字符串、数组 ≤ 3 |
| 知识保存 | `title`, `type`, `content`, `prerequisites[]` | `type` 属于枚举；`prerequisites` 只作建议，不直接建边 |
| 回答反馈 | `correctPoints[]`, `missingPoints[]`, `misconceptions[]`, `suggestedPerformance` | `suggestedPerformance` 属于四级枚举 |

- 校验失败 → 有限次（≤ 2）修复重试 → 仍失败返回 `AI_INVALID_OUTPUT`，绝不把半成品写库。
- 不把模型单次评分当作掌握度结论，只作为调度输入之一。

---

## 7. 下一步实现顺序

1. **SQLite 接入**：`server/src/db/` 下建连接与迁移脚本（`better-sqlite3` 或 `node:sqlite`），先落 `users / learning_spaces / conversations / messages`。
2. **真实对话**：`POST /api/conversations/:id/messages` 接 OpenAI 兼容接口，保留 `isMock` 语义（无 key 时仍走 mock）。
3. **知识节点**：保存 → 列表 → 编辑 → 删除，含 `knowledge_edges`。
4. **复习**：调度纯函数 + 单元测试 → `review_items` / `review_attempts` → 回忆界面（作答前不含参考答案）。
5. **学习记录**：基于真实表做聚合，不造数据。

每步都保持：接口契约先定、测试先补、页面后接。
