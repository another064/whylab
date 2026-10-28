-- 001_init：对话链路的五张表，字段按 docs/api-design.md V0.2 §4 一次到位。
-- 知识节点、复习、思维档案在各自阶段另起迁移文件。

CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE,
  profile_enabled INTEGER NOT NULL DEFAULT 1,   -- 思维档案开关
  created_at      TEXT NOT NULL
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
  ended_at      TEXT,
  profiled_at   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE socratic_rounds (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  goal            TEXT NOT NULL,
  depth           INTEGER NOT NULL DEFAULT 0,
  max_depth       INTEGER NOT NULL DEFAULT 6,
  hint_level      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL CHECK (status IN ('active','completed','abandoned')),
  summary_json    TEXT,
  started_at      TEXT NOT NULL,
  ended_at        TEXT
);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  mode            TEXT NOT NULL CHECK (mode IN ('explain','socratic')),
  kind            TEXT NOT NULL CHECK (kind IN (
                    'question','answer',
                    'goal','response','probe',
                    'nudge','hint','reveal','summary')),
  round_id        TEXT REFERENCES socratic_rounds(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  meta_json       TEXT,
  created_at      TEXT NOT NULL
);

CREATE INDEX idx_spaces_user     ON learning_spaces(user_id, updated_at);
CREATE INDEX idx_conv_space      ON conversations(space_id, updated_at);
CREATE INDEX idx_messages_conv   ON messages(conversation_id, created_at);
CREATE INDEX idx_rounds_conv     ON socratic_rounds(conversation_id, status);
-- 设计约束 6：一个对话同一时刻最多一个 active 轮次，由部分唯一索引兜底。
CREATE UNIQUE INDEX uq_rounds_one_active ON socratic_rounds(conversation_id) WHERE status = 'active';
