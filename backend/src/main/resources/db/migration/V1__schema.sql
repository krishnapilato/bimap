CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       VARCHAR(100) NOT NULL,
    surname    VARCHAR(100) NOT NULL,
    email      VARCHAR(256) NOT NULL COLLATE NOCASE UNIQUE,
    password   VARCHAR(100) NOT NULL,
    role       VARCHAR(16)  NOT NULL CHECK (role IN ('USER', 'MANAGER', 'ADMINISTRATOR')),
    locked     BOOLEAN      NOT NULL DEFAULT 0,
    enabled    BOOLEAN      NOT NULL DEFAULT 1,
    created_at TIMESTAMP    NOT NULL,
    updated_at TIMESTAMP    NOT NULL
);

CREATE TABLE form (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    region       VARCHAR(255) NOT NULL,
    province     VARCHAR(255) NOT NULL,
    municipality VARCHAR(255) NOT NULL,
    address      VARCHAR(255) NOT NULL,
    good_naming  VARCHAR(255) NOT NULL,
    number       INTEGER      NOT NULL CHECK (number >= 0),
    goodid       INTEGER      NOT NULL CHECK (goodid >= 0),
    istat_code   VARCHAR(6),
    latitude     DOUBLE       NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude    DOUBLE       NOT NULL CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE tables (
    id             INTEGER PRIMARY KEY,
    catato         VARCHAR(255),
    comune         VARCHAR(255),
    denominazione  VARCHAR(255),
    idbene         BIGINT,
    indirizzo      VARCHAR(255),
    localizzazione VARCHAR(255),
    prov           VARCHAR(255),
    provv_tutela   VARCHAR(255),
    tipo_vincolo   VARCHAR(255),
    trascrizione   VARCHAR(255),
    civico         INTEGER NOT NULL,
    proprieta      VARCHAR(255),
    local          VARCHAR(255),
    propriet       VARCHAR(255),
    provvtutela    VARCHAR(255),
    propr          VARCHAR(255),
    catasto        VARCHAR(255),
    vincolo        VARCHAR(255)
);

CREATE TABLE listacomuni (
    id        INTEGER PRIMARY KEY,
    comune    VARCHAR(255),
    provincia VARCHAR(255),
    regione   VARCHAR(255)
);
