-- 002_design_fields：界面设计稿（V0.3）新增、且落在已有表上的字段。
-- 其余设计新增字段（review_attempts.confidence 等）随各自的表在后续迁移里一次建好。

-- 首页问候“晚上好，安娜。”
ALTER TABLE users ADD COLUMN display_name TEXT;

-- 解释后“用一句话复述”：新增消息类型 restatement。
-- SQLite 不能直接改 CHECK 约束，只能重建表；001 之后 messages 还没有被其他表引用。
CREATE TABLE messages_new (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  mode            TEXT NOT NULL CHECK (mode IN ('explain','socratic')),
  kind            TEXT NOT NULL CHECK (kind IN (
                    'question','answer','restatement',
                    'goal','response','probe',
                    'nudge','hint','reveal','summary')),
  round_id        TEXT REFERENCES socratic_rounds(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  meta_json       TEXT,
  created_at      TEXT NOT NULL
);

-- 显式列出列并保留 rowid，确保同一毫秒写入的问答顺序不变
INSERT INTO messages_new (rowid, id, conversation_id, role, mode, kind, round_id, content, meta_json, created_at)
  SELECT rowid, id, conversation_id, role, mode, kind, round_id, content, meta_json, created_at FROM messages;

DROP TABLE messages;
ALTER TABLE messages_new RENAME TO messages;
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
