-- BiMap IAM baseline schema.
-- Two tables: the accounts, and the server-side record of every token issued for them.

CREATE TABLE user_account (
    id                    BIGINT       NOT NULL AUTO_INCREMENT,
    public_id             VARCHAR(36)  NOT NULL,
    first_name            VARCHAR(80)  NOT NULL,
    last_name             VARCHAR(80)  NOT NULL,
    email                 VARCHAR(254) NOT NULL,
    password_hash         VARCHAR(100)     NULL,
    status                VARCHAR(24)  NOT NULL,
    application_role      VARCHAR(24)  NOT NULL,
    auth_provider         VARCHAR(16)  NOT NULL,
    external_id           VARCHAR(128)     NULL,
    avatar_url            VARCHAR(512)     NULL,
    locale                VARCHAR(16)      NULL,
    failed_login_attempts INT          NOT NULL DEFAULT 0,
    locked_until          DATETIME(6)      NULL,
    last_login_at         DATETIME(6)      NULL,
    password_changed_at   DATETIME(6)      NULL,
    activated_at          DATETIME(6)      NULL,
    deleted_at            DATETIME(6)      NULL,
    created_at            DATETIME(6)  NOT NULL,
    updated_at            DATETIME(6)  NOT NULL,
    version               BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uk_user_account_email     UNIQUE (email),
    CONSTRAINT uk_user_account_public_id UNIQUE (public_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_user_account_status      ON user_account (status);
CREATE INDEX ix_user_account_external_id ON user_account (external_id);

CREATE TABLE security_token (
    id                   BIGINT      NOT NULL AUTO_INCREMENT,
    token_id             VARCHAR(36) NOT NULL,
    purpose              VARCHAR(24) NOT NULL,
    user_id              BIGINT      NOT NULL,
    issued_at            DATETIME(6) NOT NULL,
    expires_at           DATETIME(6) NOT NULL,
    consumed_at          DATETIME(6)     NULL,
    revoked_at           DATETIME(6)     NULL,
    replaced_by_token_id VARCHAR(36)     NULL,
    client_ip            VARCHAR(45)     NULL,
    user_agent           VARCHAR(256)    NULL,
    CONSTRAINT pk_security_token PRIMARY KEY (id),
    CONSTRAINT uk_security_token_token_id UNIQUE (token_id),
    CONSTRAINT fk_security_token_user FOREIGN KEY (user_id)
        REFERENCES user_account (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_security_token_user_purpose ON security_token (user_id, purpose);
CREATE INDEX ix_security_token_expires_at   ON security_token (expires_at);
