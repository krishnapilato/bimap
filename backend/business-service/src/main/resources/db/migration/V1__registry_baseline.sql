-- BiMap business core baseline schema.
-- One table: the asset registration, which is the whole business domain.
--
-- Geography is read from an external API and stored here as plain text alongside the ISTAT
-- code, so a record keeps the names that were true on the day it was surveyed.

CREATE TABLE asset_registration (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    public_id           VARCHAR(36)   NOT NULL,

    region              VARCHAR(64)   NOT NULL,
    province_name       VARCHAR(64)   NOT NULL,
    province_code       VARCHAR(4)    NOT NULL,
    municipality        VARCHAR(96)   NOT NULL,
    istat_code          VARCHAR(6)    NOT NULL,
    cadastral_code      VARCHAR(4)        NULL,
    postal_code         VARCHAR(5)        NULL,
    address             VARCHAR(256)  NOT NULL,
    house_number        VARCHAR(16)       NULL,
    locality            VARCHAR(128)      NULL,
    latitude            DECIMAL(10, 7)    NULL,
    longitude           DECIMAL(10, 7)    NULL,

    asset_name          VARCHAR(256)  NOT NULL,
    asset_reference     VARCHAR(64)       NULL,
    entity_billing_code VARCHAR(16)       NULL,
    entity_name         VARCHAR(256)      NULL,

    ownership           VARCHAR(128)      NULL,
    protection_measure  VARCHAR(256)      NULL,
    constraint_type     VARCHAR(128)      NULL,
    cadastral_reference VARCHAR(128)      NULL,
    transcription       VARCHAR(128)      NULL,
    notes               VARCHAR(2000)     NULL,

    status              VARCHAR(16)   NOT NULL,
    review_note         VARCHAR(512)      NULL,
    submitted_at        DATETIME(6)       NULL,
    reviewed_at         DATETIME(6)       NULL,
    reviewed_by         VARCHAR(254)      NULL,

    created_by          VARCHAR(254)  NOT NULL,
    updated_by          VARCHAR(254)      NULL,
    created_at          DATETIME(6)   NOT NULL,
    updated_at          DATETIME(6)   NOT NULL,
    version             BIGINT        NOT NULL DEFAULT 0,

    CONSTRAINT pk_asset_registration PRIMARY KEY (id),
    CONSTRAINT uk_asset_registration_public_id UNIQUE (public_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX ix_asset_registration_istat    ON asset_registration (istat_code);
CREATE INDEX ix_asset_registration_region   ON asset_registration (region);
CREATE INDEX ix_asset_registration_province ON asset_registration (province_code);
CREATE INDEX ix_asset_registration_status   ON asset_registration (status);
CREATE INDEX ix_asset_registration_author   ON asset_registration (created_by);
