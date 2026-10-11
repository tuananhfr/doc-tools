export const ENTERTAINMENT_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ent_content_sources (
    id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    metadata JSON NOT NULL, status ENUM('DRAFT','APPROVED','WITHDRAWN') NOT NULL DEFAULT 'DRAFT',
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS ent_rule_versions (
    id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    kind VARCHAR(24) CHARACTER SET ascii NOT NULL, source_ids JSON NOT NULL,
    content_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    approval_status ENUM('DRAFT','APPROVED','WITHDRAWN') NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS ent_draw_sessions (
    key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    snapshot JSON NOT NULL, expires_at BIGINT UNSIGNED NOT NULL, INDEX(expires_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS ent_request_limits (
    actor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    window_id BIGINT UNSIGNED NOT NULL, hits INT UNSIGNED NOT NULL,
    PRIMARY KEY(actor_hash, window_id), INDEX(window_id)
  ) ENGINE=InnoDB`,
]
