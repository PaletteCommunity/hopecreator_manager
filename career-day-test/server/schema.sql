PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS island_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  generation INTEGER NOT NULL DEFAULT 1,
  purge_nonce TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO island_state(id) VALUES (1);
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS cards_insert AFTER INSERT ON cards BEGIN
  UPDATE island_state SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS cards_update AFTER UPDATE ON cards BEGIN
  UPDATE island_state SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS cards_delete AFTER DELETE ON cards BEGIN
  UPDATE island_state SET revision = revision + 1 WHERE id = 1;
END;
CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('empathy', 'cool', 'cheer', 'curious')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reactions_card_cursor ON reactions(card_id, id);
CREATE INDEX IF NOT EXISTS reactions_actor ON reactions(actor_id);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
