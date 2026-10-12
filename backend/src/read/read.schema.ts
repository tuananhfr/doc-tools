// Same shape as code_request_limits: a hashed actor + UTC hour bucket, shared by every API instance.
export const READ_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS read_request_limits (
    actor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    hour BIGINT UNSIGNED NOT NULL,
    count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (actor_hash, hour), INDEX (hour)
  ) ENGINE=InnoDB`,
]
