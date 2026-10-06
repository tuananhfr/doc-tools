export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS tool_visits (
    tool VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    count BIGINT UNSIGNED NOT NULL DEFAULT 0, changed BIGINT UNSIGNED NOT NULL DEFAULT 0
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS visit_flood_locks (
    ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    seen_at BIGINT UNSIGNED NOT NULL, INDEX (seen_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS visit_flood_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires BIGINT UNSIGNED NOT NULL, INDEX (ip_hash, expires), INDEX (expires)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS rule_packages (
    digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    kind VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    signed_payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (kind, effective_from)
  ) ENGINE=InnoDB`,
  // A kind may have several published packages; the date decides which one applies (rules.repository.ts).
  `CREATE TABLE IF NOT EXISTS rule_published (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    kind VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (kind, digest)
  ) ENGINE=InnoDB`,
  // Legacy single-pointer table, drained into rule_published by migrateLegacyRuleActive().
  `CREATE TABLE IF NOT EXISTS rule_active (
    kind VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS rule_audit (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    kind VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    action ENUM('stage', 'activate', 'rollback') NOT NULL,
    actor VARCHAR(128) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (kind, changed_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS contribution_flood_locks (
    ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    seen_at BIGINT UNSIGNED NOT NULL, INDEX (seen_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS contribution_flood_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires BIGINT UNSIGNED NOT NULL, INDEX (ip_hash, expires), INDEX (expires)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS contributions (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    receipt_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    duplicate_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    tool_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    domain VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    risk ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    base_snapshot_id VARCHAR(128) NULL,
    proposed_changes JSON NOT NULL,
    source_refs JSON NOT NULL,
    jurisdiction VARCHAR(128) NULL,
    status ENUM('NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'REVOKED') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by VARCHAR(128) NULL,
    approved_by VARCHAR(128) NULL,
    published_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    INDEX (status, created_at), INDEX (domain, status)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS contribution_audit (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    contribution_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    action VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    actor VARCHAR(128) NOT NULL,
    note VARCHAR(2000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (contribution_id, created_at)
  ) ENGINE=InnoDB`,
]
