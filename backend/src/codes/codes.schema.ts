export const CODES_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS code_links (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    public_token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    manage_key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    destination_url VARCHAR(1800) NOT NULL,
    expires_at BIGINT UNSIGNED NULL,
    revoked_at BIGINT UNSIGNED NULL,
    created_at BIGINT UNSIGNED NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS code_request_limits (
    actor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    hour BIGINT UNSIGNED NOT NULL,
    count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (actor_hash, hour), INDEX (hour)
  ) ENGINE=InnoDB`,
]
