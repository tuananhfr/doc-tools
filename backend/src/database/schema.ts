export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS quality_daily (
    day CHAR(10) CHARACTER SET ascii NOT NULL,
    event VARCHAR(32) CHARACTER SET ascii NOT NULL,
    tool VARCHAR(48) CHARACTER SET ascii NOT NULL,
    count BIGINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (day, event, tool)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS quality_flood (
    ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    hour BIGINT UNSIGNED NOT NULL,
    count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (ip_hash, hour), INDEX (hour)
  ) ENGINE=InnoDB`,
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
  // A side table, not columns on `contributions`: the app's MySQL user has CREATE but no ALTER,
  // and CREATE TABLE IF NOT EXISTS never adds columns to a table that already exists.
  `CREATE TABLE IF NOT EXISTS contribution_submitters (
    contribution_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attribution_consent TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, created_at)
  ) ENGINE=InnoDB`,
  // Emails are stored lower-cased; the binary collation keeps uniqueness byte-exact.
  `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    email VARCHAR(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
    display_name VARCHAR(80) NULL,
    public_attribution TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS auth_otps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at BIGINT UNSIGNED NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    consumed_at BIGINT UNSIGNED NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    INDEX (email_hash, created_at), INDEX (expires_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS auth_flood_locks (
    key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    seen_at BIGINT UNSIGNED NOT NULL, INDEX (seen_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS auth_flood_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires BIGINT UNSIGNED NOT NULL, INDEX (key_hash, expires), INDEX (expires)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    expires_at BIGINT UNSIGNED NOT NULL,
    last_seen_at BIGINT UNSIGNED NOT NULL,
    INDEX (user_id), INDEX (expires_at)
  ) ENGINE=InnoDB`,
  // One row per grant; a user is Pro while any non-revoked row covers "now".
  `CREATE TABLE IF NOT EXISTS user_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    plan ENUM('pro') NOT NULL,
    starts_at BIGINT UNSIGNED NOT NULL,
    ends_at BIGINT UNSIGNED NOT NULL,
    revoked_at BIGINT UNSIGNED NULL,
    granted_by VARCHAR(128) NOT NULL,
    note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, ends_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS user_audit (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    action VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    actor VARCHAR(128) NOT NULL,
    note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, created_at)
  ) ENGINE=InnoDB`,
  // payload is scrubbed once a message leaves the queue, so one-time codes do not linger here.
  `CREATE TABLE IF NOT EXISTS mail_outbox (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    to_email VARCHAR(254) NOT NULL,
    template VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    payload JSON NOT NULL,
    status ENUM('pending', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    next_attempt_at BIGINT UNSIGNED NOT NULL,
    expires_at BIGINT UNSIGNED NULL,
    claim_token CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
    claimed_at BIGINT UNSIGNED NULL,
    last_error VARCHAR(500) NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    sent_at BIGINT UNSIGNED NULL,
    INDEX (status, next_attempt_at), INDEX (claim_token)
  ) ENGINE=InnoDB`,
  // One staff role per account; everyone without a row is an ordinary user.
  `CREATE TABLE IF NOT EXISTS user_roles (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    role ENUM('owner', 'admin', 'reviewer') NOT NULL,
    granted_by VARCHAR(128) NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS admin_audit (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    actor_email VARCHAR(254) NOT NULL,
    action VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    target_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    target_id VARCHAR(128) NULL,
    detail VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (created_at), INDEX (actor_id, created_at), INDEX (target_type, target_id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    value JSON NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  // Mail / GoClaw secrets set from the admin area, sealed with CONFIG_ENCRYPTION_KEY (config/secret-box.ts).
  `CREATE TABLE IF NOT EXISTS app_secrets (
    secret_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    sealed TEXT CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  // One pending self-service email change per account; the new address is used only after its code is entered.
  `CREATE TABLE IF NOT EXISTS email_changes (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    new_email VARCHAR(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at BIGINT UNSIGNED NOT NULL,
    created_at BIGINT UNSIGNED NOT NULL
  ) ENGINE=InnoDB`,
  // tool_visits only keeps an all-time total; daily rows start counting from the day this table appears.
  `CREATE TABLE IF NOT EXISTS tool_visit_days (
    day CHAR(10) CHARACTER SET ascii NOT NULL,
    tool VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    count BIGINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (day, tool), INDEX (tool, day)
  ) ENGINE=InnoDB`,
  // The API key itself lives only in GoClaw (encrypted there); this row is never enough to call a provider.
  `CREATE TABLE IF NOT EXISTS ai_providers (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    goclaw_provider_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    goclaw_name VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    provider_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    api_base VARCHAR(300) NOT NULL,
    model VARCHAR(128) NULL,
    status ENUM('verifying', 'ready', 'failed', 'disabled') NOT NULL DEFAULT 'verifying',
    last_error VARCHAR(500) NULL,
    verified_at BIGINT UNSIGNED NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    updated_at BIGINT UNSIGNED NOT NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS ai_agents (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    goclaw_agent_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    agent_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    prompt_version INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'inactive',
    created_at BIGINT UNSIGNED NOT NULL,
    updated_at BIGINT UNSIGNED NOT NULL
  ) ENGINE=InnoDB`,
  // What the agent proposes waits here, private to its owner, until they pick rows to send; a draft is
  // never reviewed or published itself, only the contribution made from it.
  `CREATE TABLE IF NOT EXISTS contribution_drafts (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    tool_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    domain VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    base_snapshot_id VARCHAR(128) NULL,
    proposed_changes JSON NOT NULL,
    source_refs JSON NOT NULL,
    uncertainties JSON NOT NULL,
    jurisdiction VARCHAR(128) NULL,
    created_by ENUM('agent', 'user') NOT NULL,
    submitted_contribution_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    INDEX (user_id, created_at)
  ) ENGINE=InnoDB`,
  // History only: which tool was checked against which package; the conversation stays in GoClaw.
  `CREATE TABLE IF NOT EXISTS ai_source_checks (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    tool_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    base_snapshot_id VARCHAR(128) NULL,
    session_key VARCHAR(200) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    draft_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    INDEX (user_id, created_at)
  ) ENGINE=InnoDB`,
  // The file itself lives under AI_UPLOAD_DIR; GoClaw fetches it once through a signed link.
  `CREATE TABLE IF NOT EXISTS ai_uploads (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    filename VARCHAR(160) NOT NULL,
    mime_type VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    link_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    link_expires_at BIGINT UNSIGNED NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    expires_at BIGINT UNSIGNED NOT NULL,
    -- A removed upload keeps its row until expiry so it still counts toward the daily quota.
    removed_at BIGINT UNSIGNED NULL,
    INDEX (user_id, created_at), INDEX (expires_at)
  ) ENGINE=InnoDB`,
  // `bookmark_tool` is the tool slug for bookmarks and NULL for results, so the unique key allows one
  // bookmark per tool while results repeat freely (MySQL unique keys ignore NULLs).
  `CREATE TABLE IF NOT EXISTS saved_items (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    kind ENUM('result', 'bookmark') NOT NULL,
    tool_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    bookmark_tool VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NULL,
    title VARCHAR(160) NOT NULL,
    payload JSON NULL,
    size_bytes INT UNSIGNED NOT NULL,
    rev INT UNSIGNED NOT NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    updated_at BIGINT UNSIGNED NOT NULL,
    UNIQUE KEY (user_id, bookmark_tool), INDEX (user_id, updated_at)
  ) ENGINE=InnoDB`,
  // One row per reminder actually queued, keyed by the plan end it was about, so a renewal that moves
  // the end date earns a fresh reminder while the hourly job never mails the same one twice.
  `CREATE TABLE IF NOT EXISTS plan_notices (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    kind ENUM('pro_expiring', 'cloud_purge') NOT NULL,
    plan_end BIGINT UNSIGNED NOT NULL,
    sent_at BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, kind, plan_end)
  ) ENGINE=InnoDB`,
  // Separate from `users` because the schema only ever creates tables; it never adds columns.
  `CREATE TABLE IF NOT EXISTS user_passwords (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    updated_at BIGINT UNSIGNED NOT NULL
  ) ENGINE=InnoDB`,
  // GoClaw holds the plain token as the user's MCP credential; we keep only its hash.
  `CREATE TABLE IF NOT EXISTS mcp_tokens (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    revoked_at BIGINT UNSIGNED NULL,
    INDEX (user_id)
  ) ENGINE=InnoDB`,
]
