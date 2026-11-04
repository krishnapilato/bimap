# Project decisions

The main technical decisions behind BiMap, why they were made and what they cost.

## Backend

### Sequential IDs instead of UUIDs

User and form IDs stay `Long` with `IDENTITY`.

- **Why:** every `/users` endpoint is administrator-only and the JWT subject is the email, so a guessable ID exposes nothing. SQLite stores rows by an integer `rowid`, and `INTEGER PRIMARY KEY AUTOINCREMENT` reuses it without an extra index or reusing deleted IDs.
- **Cost:** IDs reveal how many records exist. If they ever appear in public URLs, move to time-ordered UUIDv7.

### Request and response records instead of entities

`POST /forms` takes a `FormRequest` and returns a `SavedForm`; it never binds the JPA entity.

- **Why:** a client can't set the `id` or any other field that isn't part of the request.
- **Cost:** a request missing a numeric field gets a `400` instead of saving `0`. The database repeats the most important rules as `NOT NULL` and `CHECK` constraints in the migration.

### Stateless JWT authentication

Tokens are HS256, last 10 hours and carry only the email, issue time and expiry. The decoder rejects tokens without `exp` or `sub`. On every request the account is loaded by email: a disabled, locked or deleted account gets `401`, and the role comes from the database. CSRF protection is off because the API never authenticates with cookies.

- **Why:** the API needs no server-side sessions, and an administrator's change to an account takes effect at once instead of up to 10 hours later.
- **Cost:** one indexed query per request. A token for an active account still can't be revoked before it expires, short of changing `JWT_SECRET`.

### In-memory sign-in rate limit

`LoginAttempts` allows 10 failed sign-ins or sign-ups per client address in 15 minutes, then answers `429` with `Retry-After`.

- **Why:** stops password guessing and slows email enumeration through sign-up, with no extra dependency.
- **Cost:** counters reset on restart and aren't shared between instances. Behind a proxy the client address comes from `X-Forwarded-For`, so `SERVER_FORWARD_HEADERS_STRATEGY=framework` must only be set when the proxy is the only way in, as in Compose.

### SQLite with Flyway instead of MySQL

One database file, schema and reference data in versioned Flyway migrations, `ddl-auto=none`, WAL journaling and a one-connection pool.

- **Why:** a single instance with a small dataset doesn't need a database server. Compose loses a container, and backups are a file copy with `sqlite3 .backup`.
- **Cost:** one writer at a time and one app instance only. Hibernate's `validate` can't be used, because SQLite needs `INTEGER PRIMARY KEY` where Hibernate expects `BIGINT`; the tests check the mapping instead. SQLite constraint errors reach Spring as generic `DataAccessException`s, which is safe only because the one-connection pool makes the check-then-insert in `UserService` atomic.

### `JdbcClient` for read-only reference data

The asset register and the comuni list are read with plain SQL into records; only users and forms are JPA entities.

- **Why:** those tables are never written by the app, so entities would only add mapping code. The records are the API responses, so no entity is ever serialised.

### Native access for the SQLite driver

`--enable-native-access=ALL-UNNAMED` is set in the jar manifest, the Surefire `argLine`, `spring-boot:run` and the shared IntelliJ run configuration.

- **Why:** the driver loads a native library, and Java 24+ warns about it unless native access is granted at launch. A future release will block it.

### Seed data only in the `dev` profile

Demo users are created at startup only when `dev` is active.

- **Why:** production must never start with known accounts and passwords.

### Warnings fail the build

`javac -Xlint:all -Werror`, PMD and the tests run on every `mvnw verify`; the Docker image skips the tests, which CI runs.

- **Why:** a warning that doesn't stop the build gets ignored.
- **Cost:** an unused import or a wildcard import stops `docker compose up --build`.

## Docker

### One Dockerfile and one Compose file at the root

The root `Dockerfile` has a `backend` and a `frontend` target. In `compose.yaml` nginx serves the Angular build and proxies `/api/` to the backend over the private Compose network; only nginx publishes a port.

- **Why:** one entry point for the whole stack, and the browser talks to a single origin, so the API needs no CORS and no public port.
- **Cost:** both images build from the repository root, so `.dockerignore` must keep `node_modules`, `target` and `.env` files out of the context.

### Alpine JRE and a non-root user

The build stage uses the full JDK; the final image has only the JRE and the jar, and runs as `spring`.

- **Why:** a smaller image with fewer privileges.

### JVM options in `ENTRYPOINT`

- **Why:** `JAVA_TOOL_OPTIONS` prints a `Picked up` line at the top of the log on every start. Container support is already on by default, so only `MaxRAMPercentage` is set.

### Liveness, not overall health, for container checks

- **Why:** liveness only says whether the process works. The mail health check is turned off, because an SMTP outage shouldn't mark the app as down.

## Frontend

### Tailwind CSS and daisyUI, with no SCSS

- **Why:** almost all styling stays in the templates. Tailwind 4 isn't designed to work with preprocessors like Sass, and SCSS would add a dependency for one global stylesheet.
- **Cost:** editors report `@plugin` and `@theme` as unknown unless the Tailwind CSS IntelliSense extension is installed. This doesn't affect the build.

### TypeScript pinned to 6.0

- **Why:** Angular and `typescript-eslint` need a version below 6.1, and a newer one breaks `npm ci`.

### Comuni-ITA and Nominatim for places

The asset form gets regions, provinces and comuni from Comuni-ITA, and coordinates from Nominatim.

- **Why:** real Italian data with no key or dataset to maintain.
- **Cost:** the form depends on two third-party services being available.

### A browser-only demo on GitHub Pages

The `demo` build replaces the backend with a mock interceptor and uses hash routing.

- **Why:** anyone can try the app without a server or an account, and GitHub Pages can't serve deep links without hash routes.
- **Cost:** demo data is held in memory and lost on reload.

### Content Security Policy in `index.html`

`security.autoCsp` hashes the inline scripts and emits a strict `script-src` (`'strict-dynamic'` plus hashes). A second `<meta>` policy in `index.html` covers styles, images, fonts, connections and frames, and leaves `script-src` and `default-src` out so it can't block the hashed loader.

- **Why:** GitHub Pages can't send headers, so the policy has to live in the page. `'strict-dynamic'` lets the Google Maps loader add its own scripts without listing every Google host.
- **Cost:** `connect-src` names the API origin (`http://localhost:8080`), so a deployment on another origin must update it. `style-src` keeps `'unsafe-inline'`: the Google Maps script injects `<style>` elements at runtime, and only a per-request nonce could allow them, which a static host can't generate. Without it Street View is blocked. Injected CSS can't run script, and `img-src`, `font-src` and `connect-src` limit where it could send data. SonarQube rule Web:S7039 flags this line; it was reviewed and is safe. A `<meta>` policy can't set `frame-ancestors`; a real host should send that as a header.

### Google Maps key injected at build time

The key is a `GOOGLE_MAPS_KEY` build-time `define`, filled from a repository secret in CI and a build argument in Docker, never committed.

- **Why:** keeps the key out of the source and Git history, and GitHub push protection blocks it if it comes back.
- **Cost:** it still ships in the built JavaScript, as every browser key does, so the real protection is restricting it to known referrers in Google Cloud. Local Street View needs the key passed to `ng serve`.

### Session in `localStorage`

- **Why:** the session survives a reload with very little code, and the API doesn't use cookies.
- **Cost:** a cross-site scripting bug could read the token, so templates must keep relying on Angular's escaping. The Content Security Policy limits what injected markup can run or where it can send data.

## Known gaps

- **Frontend tests:** the frontend has only a few tests.
- **Unused places API:** the frontend now gets places from Comuni-ITA, so `/places/*` and the `listacomuni` table only serve API clients. Removing them would be a breaking change.
- **Account lockout:** the `locked` flag exists but nothing sets it; brute force is limited per address, not per account.
- **Encoding in reference data:** some comuni names in the original dump are double-encoded (for example `Agliè¨`); the migration keeps them as they were.
- **Secrets in Git history:** old commits contain real credentials. They must be rotated, because removing them from the current code doesn't invalidate them.
