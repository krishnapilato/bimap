-- Mailing lists, their subscribers, and the campaigns sent to them.
--
-- A subscriber belongs to exactly one list: consent is given per list, so the same address on two
-- lists is two rows with two histories. Campaign deliveries are not stored here at all — every
-- message lands in the existing delivery log, tagged with the campaign it belongs to, so there is
-- one place that answers "what did we send, and did it arrive".
--
-- Author: Khova Krishna Pilato

CREATE TABLE mailing_list (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    public_id      VARCHAR(36)  NOT NULL,
    name           VARCHAR(120) NOT NULL,
    description    VARCHAR(500)     NULL,
    double_opt_in  BIT(1)       NOT NULL DEFAULT b'1',
    public_signup  BIT(1)       NOT NULL DEFAULT b'0',
    status         VARCHAR(16)  NOT NULL,
    created_by     VARCHAR(254) NOT NULL,
    created_at     DATETIME(6)  NOT NULL,
    updated_at     DATETIME(6)  NOT NULL,
    version        BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pk_mailing_list PRIMARY KEY (id),
    CONSTRAINT uk_mailing_list_public_id UNIQUE (public_id),
    CONSTRAINT uk_mailing_list_name UNIQUE (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_mailing_list_status ON mailing_list (status);

CREATE TABLE list_subscriber (
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    public_id            VARCHAR(36)  NOT NULL,
    list_id              BIGINT       NOT NULL,
    email                VARCHAR(254) NOT NULL,
    first_name           VARCHAR(80)      NULL,
    last_name            VARCHAR(80)      NULL,
    status               VARCHAR(16)  NOT NULL,
    source               VARCHAR(16)  NOT NULL,
    consent_ip           VARCHAR(45)      NULL,
    subscribed_at        DATETIME(6)      NULL,
    unsubscribed_at      DATETIME(6)      NULL,
    unsubscribe_reason   VARCHAR(256)     NULL,
    confirmation_sent_at DATETIME(6)      NULL,
    created_at           DATETIME(6)  NOT NULL,
    updated_at           DATETIME(6)  NOT NULL,
    version              BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pk_list_subscriber PRIMARY KEY (id),
    CONSTRAINT uk_list_subscriber_public_id UNIQUE (public_id),
    CONSTRAINT uk_list_subscriber_list_email UNIQUE (list_id, email),
    CONSTRAINT fk_list_subscriber_list FOREIGN KEY (list_id)
        REFERENCES mailing_list (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_list_subscriber_list_status   ON list_subscriber (list_id, status);
CREATE INDEX ix_list_subscriber_email         ON list_subscriber (email);
CREATE INDEX ix_list_subscriber_subscribed_at ON list_subscriber (subscribed_at);

CREATE TABLE mail_campaign (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    public_id       VARCHAR(36)  NOT NULL,
    list_id         BIGINT       NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    preheader       VARCHAR(255)     NULL,
    body            MEDIUMTEXT   NOT NULL,
    status          VARCHAR(16)  NOT NULL,
    scheduled_at    DATETIME(6)      NULL,
    started_at      DATETIME(6)      NULL,
    completed_at    DATETIME(6)      NULL,
    recipient_count INT          NOT NULL DEFAULT 0,
    created_by      VARCHAR(254) NOT NULL,
    created_at      DATETIME(6)  NOT NULL,
    updated_at      DATETIME(6)  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pk_mail_campaign PRIMARY KEY (id),
    CONSTRAINT uk_mail_campaign_public_id UNIQUE (public_id),
    CONSTRAINT fk_mail_campaign_list FOREIGN KEY (list_id)
        REFERENCES mailing_list (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_mail_campaign_list_status ON mail_campaign (list_id, status);
CREATE INDEX ix_mail_campaign_due         ON mail_campaign (status, scheduled_at);

-- A campaign message is an ordinary delivery-log row that knows which campaign it belongs to.
ALTER TABLE sent_email ADD COLUMN campaign_id VARCHAR(36) NULL AFTER template;
CREATE INDEX ix_sent_email_campaign ON sent_email (campaign_id, recipient);
