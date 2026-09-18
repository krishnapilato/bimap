# BiMap — Backend

Two Spring Boot services on a shared kernel, built as one Maven reactor.

**Java 26 · Spring Boot 4 · Spring Security · Spring Data JPA · Flyway · MySQL · Thymeleaf mail**

| Module | What it owns |
|---|---|
| **`platform-core`** | JWT issuing and verification, the request and principal context, RFC 7807 errors, correlation ids, the operator landing and error pages, the live runtime feed, logging. Auto-configured into both services. |
| **`iam-service`** `:9843` | Sign-up and activation, sign-in with a password or Google, refresh, password recovery, the account lifecycle, transactional email and its delivery log, mailing lists with subscribers and campaigns, and the public subscription flows. **Knows nothing about cadastral registration**, so it lifts out as an IAM starter for another project. |
| **`business-service`** `:9844` | Asset registrations with their form schema, table schema, review workflow and CSV export, plus the Italian geography cascade and public-body lookups. |

The services never call each other. IAM signs a JWT; the business service verifies it locally with
the same key and rebuilds the caller from its claims.

---

## Running it

You need a JDK 26 and nothing else: the Maven wrapper fetches Maven.

```bash
docker compose -f ../docker-compose.dev.yml up -d        # MySQL :3306 and Mailpit :8025
./mvnw spring-boot:run -pl iam-service -Dspring-boot.run.profiles=dev
./mvnw spring-boot:run -pl business-service -Dspring-boot.run.profiles=dev
```

Mailpit catches every email at <http://localhost:8025>. Flyway creates the tables on first start.

Without Docker, create the two schemas and a user, then run the same commands with `DB_USERNAME`
and `DB_PASSWORD` set:

```sql
CREATE DATABASE bimap_iam  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE bimap_core CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'bimap'@'%' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON bimap_iam.*  TO 'bimap'@'%';
GRANT ALL PRIVILEGES ON bimap_core.* TO 'bimap'@'%';
```

Each service has its own production image: `iam-service/Dockerfile` and `business-service/Dockerfile`,
both multi-stage, layered, running as an unprivileged user.

---

## What you get when it is running

| | IAM `:9843` | Business `:9844` |
|---|---|---|
| Landing page with live health | <http://localhost:9843/> | <http://localhost:9844/> |
| API reference | `/swagger-ui.html` | `/swagger-ui.html` |
| Health and probes | `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness` | same |
| Live metrics feed | `/api/platform/runtime` | `/api/platform/runtime` |
| Loggers and caches (administrators) | `/actuator/loggers` | `/actuator/loggers`, `/actuator/caches` |

Each service publishes its **own** OpenAPI document; the geography lives on `:9844`, not `:9843`.

---

## The API

| Service | Base path | What it does |
|---|---|---|
| IAM | `/api/v1/auth` | Sign-up, activation, sign-in, Google sign-in, refresh, sign-out, password recovery and change, email availability. |
| IAM | `/api/v1/users` | The directory, statistics, invitations, edits and the account lifecycle. |
| IAM | `/api/v1/notifications` | The delivery log, and sending a message with attachments. |
| IAM | `/api/v1/mailing-lists` | Lists, their overview and growth, subscribers with CSV import and export, campaigns with test, schedule, send, cancel and deliveries. |
| IAM | `/api/v1/subscriptions` | Public: sign up, confirm, manage, unsubscribe and resubscribe from an email link. |
| Business | `/api/v1/registrations` | Registrations, their form and table schema, review transitions, statistics, CSV export. |
| Business | `/api/v1/geo` | Regions, provinces, comuni, addresses, postal codes, public bodies. |
| Both | `/api/platform` | The runtime feed behind the landing page and the client's health screen. |

### The guided cascade

The registration form is a chain, and each step filters the one below it. Every filter is optional,
so each endpoint also works on its own.

```http
GET /api/v1/geo/regions?q=lomb
GET /api/v1/geo/provinces?q=va&region=Lombardia          # never offers Verona
GET /api/v1/geo/municipalities?q=vare&region=Lombardia&province=VA
GET /api/v1/geo/addresses?street=Via+Sacco&municipality=Varese
GET /api/v1/geo/postal-codes?municipality=Varese
GET /api/v1/geo/entity-codes?q=Archivio+di+Stato&municipality=Varese
```

The client does not hard-code that order: `GET /api/v1/registrations/schema/form` returns the fields,
their validation, the lookup each one calls and the `cascade` sequence, so changing the flow is a
server-side edit.

**Why the geography is cached, not bundled.** Comuni-ITA has no server-side search: `/comuni` is one
document of about 3 MB for the whole country. Calling it per keystroke would download 3 MB per
character; copying it into a table would go stale the day two comuni merge. So the live API is the
source of truth and answers are cached for a configurable time. Filtering and the row limit happen
here, with a bounded top-N stream gatherer that never sorts every comune in Italy to return five.

---

## Database

Flyway owns the schema; Hibernate runs with `ddl-auto=validate`.

| Schema | Table | Holds |
|---|---|---|
| `bimap_iam` | `user_account` | people |
| `bimap_iam` | `security_token` | refresh, activation and reset tokens, swept nightly |
| `bimap_iam` | `sent_email` | the delivery log |
| `bimap_iam` | `mailing_list` | lists |
| `bimap_iam` | `list_subscriber` | who is on each list, with their consent history |
| `bimap_iam` | `mail_campaign` | campaigns and their schedule |
| `bimap_core` | `asset_registration` | registrations |

---

## Environment variables

Nothing sensitive is committed, and every value has a development default. Those marked
**required** must be set before a real deployment.

### Both services

| Variable | Required | Default | Purpose |
|---|:---:|---|---|
| `BIMAP_JWT_SECRET` | **yes** | dev placeholder | HMAC signing key, **identical in both services**, at least 64 characters. |
| `BIMAP_JWT_ISSUER` | | `bimap` | `iss` claim, verified on every parse. |
| `DB_HOST` / `DB_PORT` | | `127.0.0.1` / `3306` | MySQL. |
| `DB_NAME` | | `bimap_iam` / `bimap_core` | One schema per service. |
| `DB_USERNAME` / `DB_PASSWORD` | **yes** | `bimap` / empty | Database credentials. |
| `DB_POOL_SIZE` | | `10` | Hikari pool size. |
| `BIMAP_APP_URL` | | `http://localhost:4200` | The client, for links in emails. |
| `BIMAP_CORS_ORIGINS` | | `http://localhost:4200` | Exact origins, comma-separated. Not needed behind the stack's nginx. |
| `SPRING_PROFILES_ACTIVE` | | none | `dev` locally, `prod` in deployment. |
| `LOG_LEVEL_ROOT` / `LOG_LEVEL_APP` | | `INFO` | Logging; `LOG_LEVEL_SQL` and `LOG_LEVEL_SECURITY` too. |

### IAM service

| Variable | Required | Default | Purpose |
|---|:---:|---|---|
| `IAM_SERVER_PORT` | | `9843` | HTTP port. |
| `MAIL_HOST` / `MAIL_PORT` | **yes** | sandbox / `587` | SMTP relay. |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | **yes** | empty | SMTP credentials. |
| `MAIL_FROM` / `MAIL_FROM_NAME` | | `no-reply@bimap.local` / `BiMap` | Sender. |
| `MAIL_ENABLED` | | `true` | `false` logs messages instead of sending them. |
| `BIMAP_SEED_ENABLED` | | `true` | Seeds the founding accounts. Idempotent. |
| `BIMAP_SEED_PASSWORD` | | empty | **Leave empty in production**: seeded accounts are then created pending activation and each person chooses a password from the emailed link. |
| `BIMAP_SELF_REGISTRATION` | | `true` | Whether public sign-up accepts new accounts. |
| `BIMAP_MAX_LOGIN_ATTEMPTS` / `BIMAP_LOCKOUT_DURATION` | | `5` / `15m` | Temporary lockout after repeated failures. |
| `BIMAP_ACCESS_TOKEN_TTL` / `BIMAP_REFRESH_TOKEN_TTL` | | `15m` / `30d` | Token lifetimes. |
| `GOOGLE_CLIENT_ID` | | empty | OAuth client id. Empty disables Google sign-in. |
| `BIMAP_MAILING_LINK_SECRET` | | the JWT secret | Signs the confirm and unsubscribe links in list emails. |
| `IAM_PUBLIC_URL` | | `http://localhost:9843` | Public address of the IAM service, for one-click unsubscribe. |
| `BIMAP_MAILING_SEND_INTERVAL` | | `150ms` | Pause between campaign messages, to stay inside the relay's rate. |

### Business service

| Variable | Required | Default | Purpose |
|---|:---:|---|---|
| `BUSINESS_SERVER_PORT` | | `9844` | HTTP port. |
| `COMUNI_ITA_URL` / `COMUNI_ITA_CACHE_TTL` | | public API / `24h` | Geography; `0s` disables caching. |
| `NOMINATIM_URL` / `NOMINATIM_CACHE_TTL` | | public API / `12h` | Addresses. Nominatim allows one request a second; the cache keeps us inside that. |
| `CODICE_UNIVOCO_URL` / `CODICE_UNIVOCO_CACHE_TTL` | | public API / `12h` | Public bodies. |
| `INTEGRATION_USER_AGENT` | | `BiMap/2.0 (…)` | Sent upstream; Nominatim requires an identifiable one. |

---

## Security

- **Passwords** are bcrypt hashes. A wrong password and an unknown address give identical answers,
  and recovery and activation resend always report success, so accounts cannot be enumerated.
- **Stateless JWT**, HS512, signed and not encrypted: the claims (email, name, role, permissions)
  are readable by whoever holds the token, which is why nothing secret goes in them.
- **Refresh token rotation with reuse detection.** Each refresh burns the old token; presenting a
  burned one revokes every session on the account, in its own transaction so the 401 that follows
  cannot roll the revocation back.
- **Lockout** after repeated failures, temporary and distinct from an administrator's lock.
- **Single-use links** for activation and password reset, tracked and consumed server-side.
- **Consent** for mailing lists: double opt-in by default, signed links, a cooldown on confirmation
  emails, and imports that never resubscribe someone who left.
- **RFC 7807 errors** with a stable `code`, and an `X-Correlation-Id` on every response.
- **Transport encryption is not provided by the services.** They speak HTTP; serve them behind TLS.

---

## Testing

```bash
./mvnw test                  # unit tests
bash ../ops/smoke-test.sh    # end to end, against a running stack
```

The unit tests cover token issuing and verification, the password policy, the account lifecycle,
the error catalogue, search ranking, mailing consent and campaign rendering. The smoke test runs
every path that is supposed to fail as well: unauthenticated access, wrong roles, illegal
transitions, malformed input, refresh-token replay and forged tokens.

---

## Java 26 in use

All finalised features, no `--enable-preview`:

- **`ScopedValue`** for the request context, safe across virtual threads.
- **Virtual threads** for the HTTP server and for asynchronous email.
- **Sealed interfaces and record patterns**, so token verification and error handling are exhaustive.
- **Stream gatherers** for the bounded top-N search.
- **Records** for every DTO, value object and configuration binding, and **Markdown Javadoc** (`///`).
