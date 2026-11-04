# BiMap Backend

REST API for registering Italian heritage assets on a map: sign-in with JWT, user management for administrators, an Italian comuni autocomplete, asset data and form submissions with CSV export.

![Java](https://img.shields.io/badge/Java-27-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-JWT-6DB33F?logo=springsecurity&logoColor=white)
![Spring Data JPA](https://img.shields.io/badge/Spring_Data_JPA-Hibernate_7.4-59666C?logo=hibernate&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3.54-003B57?logo=sqlite&logoColor=white)
![Flyway](https://img.shields.io/badge/Flyway-12-CC0200?logo=flyway&logoColor=white)
![Actuator](https://img.shields.io/badge/Actuator-health_%7C_info-6DB33F?logo=spring&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-springdoc-85EA2D?logo=swagger&logoColor=black)
![JUnit](https://img.shields.io/badge/JUnit-6-25A162?logo=junit5&logoColor=white)
![Maven](https://img.shields.io/badge/Maven-3.10-C71A36?logo=apachemaven&logoColor=white)

---

## Run with Docker

The [root `compose.yaml`](../compose.yaml) runs this backend and the frontend together; see the [root README](../README.md#with-docker). There the API is reachable only through the frontend's nginx at `/api/`, and the database file lives in the `bimap-data` volume at `/data/bimap.db`.

## Run locally

Requires JDK 27.

```bash
cp .env.example .env
./mvnw spring-boot:run
```

The app reads `.env` from the working directory, so run it from this folder. In IntelliJ, use the shared **BiMap** run configuration in [`.run/`](.run/BiMap.run.xml). It adds `--enable-native-access=ALL-UNNAMED`, which the SQLite driver's native library needs on Java 24 and later; `spring-boot:run`, the tests and the jar's manifest already set it. It creates `bimap.db` in the same folder on first start and applies the [Flyway migrations](src/main/resources/db/migration). Then open:

| URL | What |
|---|---|
| <http://localhost:8080> | Landing page with links |
| <http://localhost:8080/swagger-ui.html> | Interactive API documentation |
| <http://localhost:8080/actuator/health> | Health check |

With `spring.profiles.active=dev` in `.env`, demo users are created on startup; their password is `12345678` (for example `giulia.rossi@bimap.com`, administrator).

## Tests

```bash
./mvnw verify
```

Compiles with `-Werror`, runs PMD and the test suite. The tests start the whole application against a fresh SQLite file under `target/`, run every Flyway migration and mock the mail server, so they need no network, SMTP server or Docker.

| Test class | Covers |
|---|---|
| `AuthApiTest` | Sign-in and sign-up contract, validation, email case, BCrypt's 72-byte limit |
| `SecurityApiTest` | Roles, forged, expired, unsigned and claim-escalated tokens, revoked accounts, headers, CORS, rate limiting, public endpoints |
| `UserApiTest` | User management contract, conflicts, validation, welcome email escaping and SMTP failures |
| `AssetApiTest` | Assets, places search, form validation, CSV export and formula neutralisation |
| `PersistenceTest` | Migrations, SQLite pragmas, case-insensitive unique emails, database constraints |

## Configuration

All secrets come from the environment. Locally they live in `.env` (git-ignored); in production, set them as real environment variables.

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | yes | HS256 signing key, at least 32 bytes; the app refuses to start with a shorter one |
| `MAIL_HOST`, `MAIL_PORT` | yes | SMTP server |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | yes | SMTP credentials |
| `MAIL_FROM` | yes | Sender address of outgoing emails |
| `DB_PATH` | no | SQLite file, default `bimap.db` in the working directory |
| `APP_FRONTEND_URL` | no | Allowed CORS origin and link in emails, default `http://localhost:4200` |
| `CONTENT_SECURITY_POLICY` | no | Overrides the default `Content-Security-Policy` header |
| `API_DOCS_ENABLED` | no | `false` turns off Swagger UI and `/v3/api-docs`, default `true` |
| `SERVER_FORWARD_HEADERS_STRATEGY` | no | `framework` behind a trusted reverse proxy (Compose sets it); leave unset when the app is exposed directly |
| `SERVER_PORT` | no | HTTP port, default `8080` |
| `spring.profiles.active` | no | `dev` seeds demo users; leave unset in production |

Generate a strong JWT secret with `openssl rand -base64 48`.

## API

Every endpoint except sign-in, sign-up and the public pages needs the header `Authorization: Bearer <token>`. Errors follow RFC 9457 (`application/problem+json`); validation errors add an `errors` map of field to message.

| Method and path | Access | Description |
|---|---|---|
| `POST /auth/login` | public | `{ email, password }` → `{ token, user }`, token valid for 10 hours; `429` after 10 failed attempts from one address in 15 minutes |
| `POST /auth/signup` | public | `{ name, surname, email, password }` → `201` with `{ token, user }`; creates a `USER` account (`409` if the email exists); counts towards the same limit |
| `GET /places/regions?q=` | signed in | Regions containing `q` (max 4, `q` up to 100 characters) |
| `GET /places/provinces?q=` | signed in | Provinces containing `q` (max 4) |
| `GET /places/municipalities?q=` | signed in | Comuni containing `q` (max 4) |
| `GET /assets` | signed in | All registered assets |
| `POST /forms` | signed in | Save a form; returns `201` with the saved record |
| `GET /forms/export.csv` | signed in | All saved forms as a CSV download |
| `GET /users` | administrator | List users |
| `GET /users/exists?email=` | administrator | Whether an email is already registered |
| `POST /users` | administrator | Create a user (`201`, `409` if the email exists) |
| `PUT /users/{id}` | administrator | Update a user; the password and `enabled` change only if sent |
| `DELETE /users/{id}` | administrator | Delete a user (`204`) |
| `POST /users/{id}/welcome-email` | administrator | Email the user a link to sign in (`503` if the mail server fails) |

Emails are compared without regard to case. Passwords are 8 to 72 characters, the limit of BCrypt. The full contract, with request and response schemas, is in Swagger UI.

## Monitoring

| Endpoint | Shows |
|---|---|
| `/actuator/health` | `UP` / `DOWN`; administrators also see database and disk details |
| `/actuator/health/liveness`, `/actuator/health/readiness` | Probes for Docker and Kubernetes |
| `/actuator/info` | Name, version and description |

No other actuator endpoints are exposed over HTTP. The mail server is not part of health: the app works without it, and a failed email returns `503` on that request only. Logs go to the console and never contain passwords, tokens or email addresses.

## Security

- Passwords are stored as BCrypt hashes and never returned by the API.
- Stateless JWT authentication with Spring Security. Tokens must be signed with the server key, carry a subject and an expiry, and are rejected once the account is disabled, locked or deleted; the role is read from the database on every request, never from the token.
- Failed sign-ins and sign-ups are limited per client address.
- Every request body, query parameter and path variable is validated; requests never bind JPA entities.
- CSV cells that start with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'`, so spreadsheets don't run them as formulas.
- Responses carry a restrictive `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. The landing page and Swagger UI work under it with no inline code.
- CSRF protection is off on purpose: the API authenticates only through the `Authorization` header, never with cookies.
- CORS allows only the configured frontend origin.
- Public pages show no Java, Spring Boot or OS versions.
- The Docker image runs as a non-root user and contains only the JRE and the jar.

## Database

SQLite in a single file, with WAL journaling, foreign keys on, a 5-second busy timeout and a one-connection pool, so all database work runs one transaction at a time. [Flyway](src/main/resources/db/migration) owns the schema; Hibernate never changes it (`ddl-auto=none`). `V1` creates the tables, `V2` loads the asset register and the comuni list. A new schema change is a new `V3__….sql` file, never an edit to an applied one.

### Limits

- **One writer at a time.** Fine for this app's load; heavy concurrent writing would queue behind the single connection.
- **One instance only.** The file can't be shared by several app instances or over a network file system. Scaling out means moving to a server database.
- **Backups must be consistent.** Copying the file while the app runs can capture a half-written state. Use `sqlite3 bimap.db ".backup 'bimap-backup.db'"` or stop the app first.
- Case-insensitive matching (emails, place search) covers ASCII letters only; MySQL's collation also ignored accents.

### Moving data from MySQL

The asset register and comuni come from the migrations, so only `users` and `form` need to be copied. Nothing here deletes the MySQL data.

1. **Back up MySQL:** `mysqldump -u root -p bimap > bimap-mysql-backup.sql`
2. **Create the SQLite schema:** start the new version once (`./mvnw spring-boot:run`), then stop it.
3. **Export the two tables as tab-separated files:**

   ```bash
   mysql -u root -p -B -N bimap -e "SELECT id, name, surname, email, password, role, locked, enabled, UNIX_TIMESTAMP(created_at)*1000, UNIX_TIMESTAMP(updated_at)*1000 FROM users" > users.tsv
   mysql -u root -p -B -N bimap -e "SELECT id, region, province, municipality, address, good_naming, number, goodid, istat_code, latitude, longitude FROM form" > form.tsv
   ```

4. **Import them:**

   ```bash
   sqlite3 bimap.db <<'SQL'
   .mode tabs
   .import users.tsv users
   .import form.tsv form
   UPDATE form SET istat_code = NULL WHERE istat_code = 'NULL';
   SQL
   ```

5. **Check:** compare `SELECT count(*)` on both sides, sign in with a known account and download the CSV export.

**Rollback:** stop the new version and start the previous release against the untouched MySQL database. If anything was written to SQLite in the meantime, export it the same way in reverse. Keep `bimap-mysql-backup.sql` until the new version has run in production for a while.

## Project structure

```
src/main/java/com/bimap
├── controller   REST endpoints and error handling
├── core         Security, rate limiting, mail, OpenAPI and dev seed data
├── model        JPA entities and response records
├── repository   Spring Data repositories and JdbcClient queries
└── service      User management
src/main/resources
├── db/migration Flyway migrations
├── static       Landing page, favicon, self-hosted Geist font and image
└── application.properties
```

## Before going to production

- Rotate every secret that was ever committed and set new ones as environment variables.
- Leave `spring.profiles.active` unset, so no demo accounts are created, and create the first administrator.
- Serve the app over HTTPS behind a reverse proxy, so the browser also gets `Strict-Transport-Security`.
- Decide whether Swagger UI stays public (`API_DOCS_ENABLED=false` turns it off).
- Schedule backups of the database volume with `sqlite3 .backup`.

## Author

**Khova Krishna Pilato** — [github.com/krishnapilato](https://github.com/krishnapilato)
