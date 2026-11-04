# Project decisions

The main technical decisions behind BiMap, why they were made and what they cost.

## Backend

### Sequential IDs instead of UUIDs

User and form IDs stay `Long` with `IDENTITY`.

- **Why:** every `/users` endpoint is administrator-only, so a guessable ID grants no access. JWT subjects use the immutable user ID. SQLite stores rows by an integer `rowid`, and `INTEGER PRIMARY KEY AUTOINCREMENT` reuses it without an extra index or reusing deleted IDs.
- **Cost:** IDs reveal how many records exist. If they ever appear in public URLs, move to time-ordered UUIDv7.

### Request and response records instead of entities

`POST /forms` takes a `FormRequest` and returns a `SavedForm`; it never binds the JPA entity.

- **Why:** a client can't set the `id` or any other field that isn't part of the request.
- **Cost:** a request missing a numeric field gets a `400` instead of saving `0`. The database repeats the most important rules as `NOT NULL` and `CHECK` constraints in the migration.

### Stateless JWT authentication

Tokens are HS256, last 10 hours and carry the immutable user ID as `sub`, a per-account version as `ver`, issue time and expiry. The decoder requires an expiry, a positive user ID that fits in a `Long`, and a version string. On every request the account is loaded by ID: disabled, locked, deleted or version-mismatched accounts get `401`, and the role comes from the database. Password and enabled-state changes advance the version, so old tokens stay invalid after reactivation. Renaming or reassigning an email cannot transfer an old token to another account. CSRF protection is off because the API never authenticates with cookies.

- **Why:** the API needs no server-side sessions, and an administrator's change to an account takes effect at once instead of up to 10 hours later.
- **Cost:** one indexed query per request and one version column. Revocation affects all tokens for an account; there is no individual-session token denylist.
- **Migration:** V3 adds a zero-initialised version to existing users without changing their password hashes. Existing tokens with email subjects or without a version are rejected; users must sign in again. There is no fallback to email lookup.

### Account lifecycle and first administrator

Credential verification and loading the account by its authenticated ID run in one transaction. With the single-connection pool, an email reassignment cannot interleave between these operations. User updates preserve the role when it is omitted. Deletion, disabling and demotion refuse to remove the last enabled, unlocked administrator; checks and writes share the same transaction.

- **Bootstrap:** the opt-in `bootstrap-admin` profile uses environment credentials, validates them and creates an administrator only if none is active. It refuses to promote an already registered ordinary account. Remove the profile and credentials after provisioning; production never enables `dev`.
- **Cost:** BCrypt verification holds the single database connection until the authentication transaction completes. This favours correctness for this small single-instance application; scaling requires revisiting transaction locking and the database choice together.

### Form validation and bounded CSV export

Forms require explicit integer street numbers and asset IDs; fractional values are rejected instead of truncated. A nonzero asset ID must exist in the register, while zero denotes an unlisted asset. Geographic fields remain free text: the legacy local comuni list is incomplete and cannot authoritatively validate current Italian administrative boundaries. The frontend uses Comuni-ITA.

Exports write UTF-8 directly to the response in pages of 500 records, bounded by the maximum form ID at the start. The original columns stay in order, with `number` and `goodID` appended. All text columns are protected against formula prefixes, including line feeds and imported ISTAT values. Empty exports include a header.

- **Why:** exports preserve the submitted data without allocating the entire dataset and CSV string in memory. Database reads finish before each batch is written to the client.
- **Cost:** exports occupy a servlet thread, and records submitted after the initial maximum ID are included in the next export. Spreadsheet type inference can still remove ISTAT leading zeroes, so that column should be imported as text.

### Repairing legacy reference text

V4 applies 598 targeted field corrections for known UTF-8 text decoded as Windows-1252/Latin-1, including double-encoded text and `Agliè¨`. Every update matches both the ID and original value, preserving local corrections. V1/V2 and submitted forms remain unchanged. The asset API falls back to the populated `tipo_vincolo` field when legacy `vincolo` is empty, retaining the original protection information.

### BCrypt password byte limit

Passwords must contain at least 8 characters and fit within 72 UTF-8 bytes. A shared Bean Validation constraint checks byte length on sign-in, sign-up and administrator create/update requests, alongside the existing character constraints.

- **Why:** BCrypt rejects new passwords over 72 bytes. Character counts alone let multibyte passwords through and cause server errors; validation returns `400` with a password field error instead.
- **Cost:** the maximum number of characters depends on their UTF-8 encoding. For example, 36 `é` characters fit, while 37 do not. Existing passwords are not rehashed by this change.

### In-memory sign-in rate limit

`LoginAttempts` allows 10 failed sign-ins or sign-ups per client address in a fixed 15-minute window, then answers `429` with `Retry-After`. It atomically reserves a slot before authentication; successful sign-ins release only their own reservation. In-flight requests count against the limit, and sign-ups retain their slot whether they succeed or fail.

- **Why:** stops password guessing and slows email enumeration through sign-up, with no extra dependency. Reserving and checking under one lock prevents concurrent requests from bypassing the limit. Authentication runs outside the lock.
- **Memory:** an insertion-ordered map holds at most 10,000 client windows. Requests remove expired windows from the front, avoiding repeated full-map scans. At capacity, new clients receive `429` until the oldest window expires; existing clients keep their counters. Active windows are never evicted to make room, which would let new addresses erase existing limits.
- **Cost:** counters reset on restart and aren't shared between instances. Capacity exhaustion temporarily blocks new clients, and 10 simultaneous sign-ins can temporarily fill a client's slots even if they later succeed. Behind a proxy the client address comes from `X-Forwarded-For`, so `SERVER_FORWARD_HEADERS_STRATEGY=framework` must only be set when the proxy is the only way in, as in Compose. nginx removes client-supplied `Forwarded`, `X-Forwarded-Port` and `X-Forwarded-Ssl` headers before supplying its trusted forwarding values; otherwise Spring could prefer an attacker-supplied address.

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

### Compiler warnings and analysis findings fail the build

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
- **Cost:** user edits and submitted forms remain in memory. The 687 reference assets load lazily and have a validated sessionStorage snapshot with memory fallback.

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

- **Unused places API:** the frontend now gets places from Comuni-ITA, so `/places/*` and the `listacomuni` table only serve API clients. Removing them would be a breaking change.
- **Account lockout:** the `locked` flag exists but nothing sets it; brute force is limited per address, not per account.
- **Secrets in Git history:** old commits contain real credentials. They must be rotated, because removing them from the current code doesn't invalidate them.

### Angular state and accessible controls

Signals and rxResource own local state, while AuthService and DemoStore own shared session/demo state; no additional state package is required. Session expiry, cross-tab changes and late API responses are handled explicitly. Native dialogs provide focus management; custom autocomplete keeps the option list below the input and supports keyboard navigation.

### Dynamic heritage photography

Frontend and backend share a native custom element that discovers Italian photographs through Wikimedia Commons, using the previous year’s Wiki Loves Monuments category. No cities or photograph URLs are maintained. Only validated HTTPS image/source/license hosts and supported free licenses are accepted; metadata is rendered as text.

A five-photo queue stores metadata in sessionStorage for six hours and preloads thumbnails through the HTTP cache. Refill happens near depletion, without automatic slide changes. The API and image stages each have a ten-second deadline and visible retry. Commons availability and browser cache eviction remain external limits. Stable gallery filenames revalidate through nginx. The status hidden rule must outrank its flex layout to avoid covering a loaded photograph.

### CSV preview and save

Preview parsing is bounded to 64 KiB and ten rows, with quoted fields preserved. The original blob is saved after confirmation. Native save-location selection requires browser support and a user click; other browsers follow download settings. Table overflow stays inside the dialog.

### Dependency override

The minimatch override resolves the vulnerable transitive development dependency without changing Angular’s supported TypeScript range. Revisit it when upstream tooling no longer needs it.
