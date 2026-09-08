-- The delivery log.
--
-- One row per message the platform tried to send, transactional or composed by hand. Attachment
-- bytes are deliberately absent: filenames and sizes explain a delivery, the payload would turn a
-- log table into a file store.
--
-- Author: Khova Krishna Pilato

CREATE TABLE sent_email (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    public_id          VARCHAR(36)  NOT NULL,
    recipient          VARCHAR(320) NOT NULL,
    subject            VARCHAR(255) NOT NULL,
    template           VARCHAR(40)      NULL,
    format             VARCHAR(8)   NOT NULL,
    status             VARCHAR(8)   NOT NULL,
    body               TEXT             NULL,
    attachment_summary VARCHAR(1024)    NULL,
    failure_reason     VARCHAR(512)     NULL,
    sent_at            DATETIME(6)  NOT NULL,
    CONSTRAINT pk_sent_email PRIMARY KEY (id),
    CONSTRAINT uk_sent_email_public_id UNIQUE (public_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_sent_email_sent_at   ON sent_email (sent_at);
CREATE INDEX ix_sent_email_recipient ON sent_email (recipient);
CREATE INDEX ix_sent_email_status    ON sent_email (status);
