-- =============================================================================
-- IronMind AI - Sprint 2: persistent authentication state
--
-- Two tables support the token strategy defined in SPEC.md section 14.1:
--
--   * refresh_tokens       - opaque rotating refresh tokens, stored as a
--                            SHA-256 hash. The plain token never touches the
--                            database. A family groups the tokens of one login
--                            session, so a replayed token can revoke the whole
--                            family.
--   * password_reset_tokens - single use recovery tokens, also stored hashed.
--
-- The plain value of a token exists only in the client and in the login
-- response. A leak of this table does not grant access to any session.
-- =============================================================================

CREATE TABLE refresh_tokens (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid        NOT NULL,
    family_id            uuid        NOT NULL,
    token_hash           char(64)    NOT NULL,
    expires_at           timestamptz NOT NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    revoked_at           timestamptz,
    replaced_by_token_id uuid        REFERENCES refresh_tokens (id) ON DELETE SET NULL,
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

CREATE TABLE password_reset_tokens (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL,
    token_hash char(64)    NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
