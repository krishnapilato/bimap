#!/usr/bin/env bash
#
# BiMap end-to-end smoke test.
#
# Exercises both services against a running stack, including the paths that are supposed to fail.
# Run it after any change:
#
#     bash ops/smoke-test.sh
#
# Needs both services up and node on PATH.
#
# Author: Khova Krishna Pilato

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

IAM="${IAM_URL:-http://localhost:9843}"
BIZ="${BUSINESS_URL:-http://localhost:9844}"
PASSWORD="${BIMAP_SEED_PASSWORD:-Cadastr0-Rilievo!}"

ADMIN="krishnak.pilato@gmail.com"
MANAGER="marco.bianchi@bimap.local"
PLAIN_USER="giulia.rossi@bimap.local"

passed=0
failed=0

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; passed=$((passed + 1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; failed=$((failed + 1)); }

# check <description> <expected> <actual>
check() {
    if [[ "$2" == "$3" ]]; then
        printf '  \033[32mPASS\033[0m  %-56s %s\n' "$1" "$3"
        passed=$((passed + 1))
    else
        bad "$(printf '%-56s expected [%s], got [%s]' "$1" "$2" "$3")"
    fi
}

# contains <description> <needle> <haystack>
contains() {
    if [[ "$3" == *"$2"* ]]; then
        ok "$1"
    else
        bad "$(printf '%-56s did not contain [%s]' "$1" "$2")"
    fi
}

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$@"; }
body()   { curl -s --max-time 30 "$@"; }
json()   { node "$SCRIPT_DIR/json.js" "$1"; }

login() {
    body -X POST "$IAM/api/v1/auth/login" -H 'Content-Type: application/json' \
        -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}"
}

# Access tokens live 15 minutes and this suite calls slow upstream APIs, so the roles are
# re-authenticated before each section that needs them.
authenticate() {
    ADMIN_SESSION=$(login "$ADMIN")
    ADMIN_TOKEN=$(json 'j.accessToken' <<< "$ADMIN_SESSION")
    ADMIN_REFRESH=$(json 'j.refreshToken' <<< "$ADMIN_SESSION")
    MANAGER_TOKEN=$(json 'j.accessToken' <<< "$(login "$MANAGER")")
    USER_TOKEN=$(json 'j.accessToken' <<< "$(login "$PLAIN_USER")")
    AUTH="Authorization: Bearer $ADMIN_TOKEN"
}

# ─────────────────────────────────────────────────────────────────────────────
bold "Public surface (no token)"

check "IAM landing page is public"          200 "$(status "$IAM/")"
check "Business landing page is public"     200 "$(status "$BIZ/")"
check "Stylesheet is public"                200 "$(status "$IAM/platform.css")"
check "Script is public"                    200 "$(status "$IAM/platform.js")"
check "Runtime metrics feed is public"      200 "$(status "$IAM/api/platform/runtime")"
check "Health is public"                    200 "$(status "$IAM/actuator/health")"
check "Swagger UI is reachable"             200 "$(status "$IAM/swagger-ui/index.html")"
check "OpenAPI document is reachable"       200 "$(status "$BIZ/v3/api-docs")"

runtime=$(body "$IAM/api/platform/runtime")
check "Runtime feed reports live health"    UP   "$(json 'j.status' <<< "$runtime")"
check "Runtime feed reports heap usage"     true "$(json 'j.heap.used > 0' <<< "$runtime")"
check "Runtime feed reports uptime"         true "$(json 'j.uptime.seconds >= 0' <<< "$runtime")"
check "Runtime feed lists health checks"    true "$(json 'j.components.length > 0' <<< "$runtime")"

geo_docs=$(body "$BIZ/v3/api-docs")
check "Business OpenAPI lists the geo endpoints" true \
    "$(json 'Object.keys(j.paths).some(p => p.startsWith("/api/v1/geo"))' <<< "$geo_docs")"
check "Business OpenAPI credits its data sources" true \
    "$(json 'j.info.description.includes("Comuni-ITA")' <<< "$geo_docs")"

# ─────────────────────────────────────────────────────────────────────────────
bold "Error representation"

check "Unknown path is refused"             401 "$(status -H 'Accept: application/json' "$IAM/nope")"
problem=$(body -H 'Accept: application/json' "$IAM/nope")
check "API client gets a problem document"  urn:bimap:error:authentication-required "$(json 'j.type' <<< "$problem")"
check "Problem carries a machine code"      AUTHENTICATION_REQUIRED "$(json 'j.code' <<< "$problem")"
check "Problem carries a correlation id"    true "$(json 'typeof j.correlationId === "string"' <<< "$problem")"

html=$(body -H 'Accept: text/html,application/xhtml+xml' "$IAM/nope")
contains "Browser gets the rendered error page" 'You need to sign in' "$html"
contains "Error page names the offending path"  '/nope'               "$html"

headers=$(curl -s -D - -o /dev/null --max-time 30 "$IAM/api/platform/runtime")
contains "Every response carries a correlation id" 'X-Correlation-Id' "$headers"

# ─────────────────────────────────────────────────────────────────────────────
bold "Authentication"

authenticate

check "Administrator signs in"              ADMINISTRATOR "$(json 'j.user.role' <<< "$ADMIN_SESSION")"
check "Token type is Bearer"                Bearer        "$(json 'j.tokenType' <<< "$ADMIN_SESSION")"
check "Access token lives 15 minutes"       900           "$(json 'j.expiresIn' <<< "$ADMIN_SESSION")"
check "Manager signs in"                    MANAGER       "$(json 'j.user.role' <<< "$(login "$MANAGER")")"
check "Plain user signs in"                 USER          "$(json 'j.user.role' <<< "$(login "$PLAIN_USER")")"
check "Response never carries a password"   true          "$(json 'j.user.passwordHash === undefined' <<< "$ADMIN_SESSION")"
check "Role permissions travel in the token" true         "$(json 'j.user.permissions.length === 7' <<< "$ADMIN_SESSION")"

me=$(body "$IAM/api/v1/users/me" -H "$AUTH")
check "Caller is resolved from the token"   "$ADMIN" "$(json 'j.email' <<< "$me")"
check "Identity is a public id, not a row id" true   "$(json 'typeof j.id === "string" && j.id.length === 36' <<< "$me")"

check "A missing token is refused"          401 "$(status -H 'Accept: application/json' "$IAM/api/v1/users/me")"
check "A garbage token is refused"          401 "$(status -H 'Accept: application/json' -H 'Authorization: Bearer nonsense' "$IAM/api/v1/users/me")"

wrong=$(body -X POST "$IAM/api/v1/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$MANAGER\",\"password\":\"DefinitelyWrong1!\"}")
unknown=$(body -X POST "$IAM/api/v1/auth/login" -H 'Content-Type: application/json' \
    -d '{"email":"nobody@example.com","password":"DefinitelyWrong1!"}')
check "Wrong password and unknown address answer alike" \
    "$(json 'j.detail' <<< "$wrong")" "$(json 'j.detail' <<< "$unknown")"

# ─────────────────────────────────────────────────────────────────────────────
bold "Refresh rotation and reuse detection"

victim=$(login "$PLAIN_USER")
FIRST=$(json 'j.refreshToken' <<< "$victim")

rotated=$(body -X POST "$IAM/api/v1/auth/refresh" -H 'Content-Type: application/json' \
    -d "{\"refreshToken\":\"$FIRST\"}")
SECOND=$(json 'j.refreshToken' <<< "$rotated")
check "Refresh returns a working access token" true "$(json 'j.accessToken.startsWith("ey")' <<< "$rotated")"
if [[ -n "$SECOND" && "$SECOND" != "$FIRST" ]]; then
    ok "Refresh token is rotated, not reissued"
else
    bad "Refresh token is rotated, not reissued"
fi

replay=$(body -X POST "$IAM/api/v1/auth/refresh" -H 'Content-Type: application/json' \
    -d "{\"refreshToken\":\"$FIRST\"}")
check "Replaying a consumed token is refused" 401 "$(json 'j.status' <<< "$replay")"
contains "Reuse ends every session on the account" 'All sessions have been ended' "$(json 'j.detail' <<< "$replay")"

orphaned=$(body -X POST "$IAM/api/v1/auth/refresh" -H 'Content-Type: application/json' \
    -d "{\"refreshToken\":\"$SECOND\"}")
check "The rotated token dies with the family" 401 "$(json 'j.status' <<< "$orphaned")"

# ─────────────────────────────────────────────────────────────────────────────
bold "Registration and password policy"

NEW_EMAIL="smoke-$(date +%s)@bimap.local"
check "A free address reports available"    true  "$(json 'j.available' <<< "$(body "$IAM/api/v1/auth/email-availability?email=$NEW_EMAIL")")"
check "A taken address reports unavailable" false "$(json 'j.available' <<< "$(body "$IAM/api/v1/auth/email-availability?email=$ADMIN")")"

registered=$(body -X POST "$IAM/api/v1/auth/register" -H 'Content-Type: application/json' \
    -d "{\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"email\":\"$NEW_EMAIL\",\"password\":\"Cadastr0-Rilievo!\"}")
check "Sign-up creates a pending account"   PENDING_ACTIVATION "$(json 'j.status' <<< "$registered")"
check "New accounts get the USER role"      USER "$(json 'j.role' <<< "$registered")"

duplicate=$(body -X POST "$IAM/api/v1/auth/register" -H 'Content-Type: application/json' \
    -d "{\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"email\":\"$NEW_EMAIL\",\"password\":\"Cadastr0-Rilievo!\"}")
check "A duplicate address is a conflict"   409 "$(json 'j.status' <<< "$duplicate")"

pending=$(body -X POST "$IAM/api/v1/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"Cadastr0-Rilievo!\"}")
check "An unactivated account cannot sign in" 403 "$(json 'j.status' <<< "$pending")"

weak=$(body -X POST "$IAM/api/v1/auth/register" -H 'Content-Type: application/json' \
    -d '{"firstName":"Weak","lastName":"Pass","email":"weak-smoke@bimap.local","password":"short"}')
check "A weak password is rejected"         400 "$(json 'j.status' <<< "$weak")"
contains "Every unmet rule is reported at once" 'uppercase' "$(json 'j.violations[0].message' <<< "$weak")"

check "Password recovery never reveals anything" 202 \
    "$(status -X POST "$IAM/api/v1/auth/password/forgot" -H 'Content-Type: application/json' -d '{"email":"nobody@example.com"}')"
check "Activation resend never reveals anything" 202 \
    "$(status -X POST "$IAM/api/v1/auth/activate/resend" -H 'Content-Type: application/json' -d '{"email":"nobody@example.com"}')"

# ─────────────────────────────────────────────────────────────────────────────
bold "Authorisation"

authenticate

check "Manager may list users"              200 "$(status "$IAM/api/v1/users" -H "Authorization: Bearer $MANAGER_TOKEN")"
check "Plain user may not list users"       403 "$(status -H 'Accept: application/json' "$IAM/api/v1/users" -H "Authorization: Bearer $USER_TOKEN")"
check "Manager may not create users"        403 "$(status -H 'Accept: application/json' -X POST "$IAM/api/v1/users" -H "Authorization: Bearer $MANAGER_TOKEN" -H 'Content-Type: application/json' -d '{"firstName":"A","lastName":"B","email":"nope@bimap.local","role":"USER"}')"
check "Administrator may read statistics"   200 "$(status "$IAM/api/v1/users/statistics" -H "$AUTH")"

page=$(body "$IAM/api/v1/users?q=rossi&size=5" -H "$AUTH")
check "Search returns a paged envelope"     0    "$(json 'j.page' <<< "$page")"
check "Search matches on surname"           true "$(json 'j.content.some(u => u.lastName === "Rossi")' <<< "$page")"

stats=$(body "$IAM/api/v1/users/statistics" -H "$AUTH")
check "Statistics count active accounts"    true "$(json 'j.active >= 5' <<< "$stats")"

# ─────────────────────────────────────────────────────────────────────────────
bold "Geography cascade (live upstream APIs)"

check "Geo requires a token"                401 "$(status -H 'Accept: application/json' "$BIZ/api/v1/geo/regions")"

regions=$(body "$BIZ/api/v1/geo/regions?q=lomb" -H "$AUTH")
check "Region search finds Lombardia"       Lombardia "$(json 'j[0].name' <<< "$regions")"

provinces=$(body "$BIZ/api/v1/geo/provinces?q=va&region=Lombardia" -H "$AUTH")
check "Province search stays inside the region" true \
    "$(json 'j.length > 0 && j.every(p => p.region === "Lombardia")' <<< "$provinces")"
check "Varese is offered"                   true "$(json 'j.some(p => p.abbreviation === "VA")' <<< "$provinces")"

nationwide=$(body "$BIZ/api/v1/geo/provinces?q=va" -H "$AUTH")
check "Without a region the search is national" true \
    "$(json 'j.some(p => p.region !== "Lombardia")' <<< "$nationwide")"

municipalities=$(body "$BIZ/api/v1/geo/municipalities?q=vare&region=Lombardia&province=VA" -H "$AUTH")
check "Exact name ranks first"              Varese "$(json 'j[0].name' <<< "$municipalities")"
check "Result carries the ISTAT code"       012133 "$(json 'j[0].istatCode' <<< "$municipalities")"
check "Result carries the cadastral code"   L682   "$(json 'j[0].cadastralCode' <<< "$municipalities")"
check "Result carries the postcode"         21100  "$(json 'j[0].postalCode' <<< "$municipalities")"
check "Result carries coordinates"          true   "$(json 'j[0].latitude !== null' <<< "$municipalities")"
check "Autocomplete is limited to five"     true   "$(json 'j.length <= 5' <<< "$municipalities")"

check "Search by ISTAT code works"          Varese "$(json 'j[0].name' <<< "$(body "$BIZ/api/v1/geo/municipalities?q=012133" -H "$AUTH")")"
check "Accents are ignored when matching"   true   "$(json 'j.length > 0' <<< "$(body "$BIZ/api/v1/geo/municipalities?q=forli" -H "$AUTH")")"

check "Lookup by ISTAT code resolves"       Varese "$(json 'j.name' <<< "$(body "$BIZ/api/v1/geo/municipalities/012133" -H "$AUTH")")"
check "An unknown ISTAT code is a 404"      404    "$(json 'j.status' <<< "$(body "$BIZ/api/v1/geo/municipalities/999999" -H "$AUTH")")"

addresses=$(body "$BIZ/api/v1/geo/addresses?street=Via+Sacco&municipality=Varese&province=Varese&limit=3" -H "$AUTH")
check "Address lookup resolves a street"    true "$(json 'j.length > 0' <<< "$addresses")"
check "Resolved address carries a postcode" true "$(json 'j.length > 0 && !!j[0].postalCode' <<< "$addresses")"
check "Resolved address carries coordinates" true "$(json 'j.length > 0 && j[0].latitude !== null' <<< "$addresses")"
check "Address lookup needs a street or q"  422  "$(json 'j.status' <<< "$(body "$BIZ/api/v1/geo/addresses?municipality=Varese" -H "$AUTH")")"

check "Postcode lookup answers for the comune" 21100 "$(json 'j[0]' <<< "$(body "$BIZ/api/v1/geo/postal-codes?municipality=Varese&province=VA" -H "$AUTH")")"

entities=$(body "$BIZ/api/v1/geo/entity-codes?q=Archivio+di+Stato&municipality=Varese&limit=3" -H "$AUTH")
check "Entity lookup narrows to the comune" true \
    "$(json 'j.length > 0 && j.every(e => e.municipality === "Varese")' <<< "$entities")"
check "Entity lookup works nationally too"  true \
    "$(json 'j.length > 0' <<< "$(body "$BIZ/api/v1/geo/entity-codes?q=Archivio+di+Stato&limit=3" -H "$AUTH")")"

# ─────────────────────────────────────────────────────────────────────────────
bold "Registrations"

form=$(body "$BIZ/api/v1/registrations/schema/form" -H "$AUTH")
check "Form schema publishes the guided order" \
    "region,provinceName,municipality,address,postalCode,assetName,istatCode,entityName" \
    "$(json 'j.cascade.join(",")' <<< "$form")"
check "Autocomplete fields declare a lookup URL" true \
    "$(json 'j.sections.flatMap(s => s.fields).some(f => (f.lookupUrl || "").includes("/api/v1/geo/provinces"))' <<< "$form")"
check "Asset name is the one field with no lookup" true \
    "$(json 'j.sections.flatMap(s => s.fields).find(f => f.name === "assetName").lookupUrl === undefined' <<< "$form")"

table=$(body "$BIZ/api/v1/registrations/schema/table" -H "$AUTH")
check "Table schema declares a default sort" createdAt "$(json 'j.defaultSort' <<< "$table")"
check "Table schema declares columns"        true      "$(json 'j.columns.length > 5' <<< "$table")"

REF="SMOKE-$(date +%s)"
created=$(body -X POST "$BIZ/api/v1/registrations" -H "$AUTH" -H 'Content-Type: application/json' -d "{
    \"region\":\"Lombardia\",\"provinceName\":\"Varese\",\"provinceCode\":\"VA\",\"municipality\":\"Varese\",
    \"istatCode\":\"012133\",\"cadastralCode\":\"L682\",\"postalCode\":\"21100\",
    \"address\":\"Via Sacco\",\"houseNumber\":\"$RANDOM\",\"latitude\":45.8167,\"longitude\":8.83333,
    \"assetName\":\"Palazzo Estense $REF\",\"assetReference\":\"$REF\",
    \"entityName\":\"Comune di Varese\",\"entityBillingCode\":\"UFO6JZ\",
    \"ownership\":\"Comune di Varese\",\"constraintType\":\"Vincolo diretto\"}")
REG_ID=$(json 'j.id' <<< "$created")
check "Registration is created as a draft"  DRAFT   "$(json 'j.status' <<< "$created")"
check "Author is stamped from the token"    "$ADMIN" "$(json 'j.createdBy' <<< "$created")"
check "Street and number are joined"        true    "$(json 'j.fullAddress.startsWith("Via Sacco ")' <<< "$created")"

invalid=$(body -X POST "$BIZ/api/v1/registrations" -H "$AUTH" -H 'Content-Type: application/json' \
    -d '{"region":"Lombardia","provinceName":"Varese","provinceCode":"VA","municipality":"Varese","istatCode":"12","address":"Via X","assetName":"Y"}')
check "A malformed ISTAT code is rejected"  400       "$(json 'j.status' <<< "$invalid")"
check "The offending field is named"        istatCode "$(json 'j.violations[0].field' <<< "$invalid")"

check "Draft moves to submitted"    SUBMITTED "$(json 'j.status' <<< "$(body -X PUT "$BIZ/api/v1/registrations/$REG_ID/status" -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"SUBMITTED"}')")"
check "Submitted moves to verified" VERIFIED  "$(json 'j.status' <<< "$(body -X PUT "$BIZ/api/v1/registrations/$REG_ID/status" -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"VERIFIED","note":"Checked on site"}')")"
check "An illegal transition is refused" 422  "$(json 'j.status' <<< "$(body -X PUT "$BIZ/api/v1/registrations/$REG_ID/status" -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"DRAFT"}')")"

filtered=$(body "$BIZ/api/v1/registrations?provinceCode=VA&size=5" -H "$AUTH")
check "Table query filters by province"     true "$(json 'j.content.every(r => r.provinceCode === "VA")' <<< "$filtered")"
check "Table query returns a paged envelope" true "$(json 'typeof j.totalElements === "number"' <<< "$filtered")"
check "Table query honours the page size"   true "$(json 'j.content.length <= 5' <<< "$filtered")"

scoped=$(body "$BIZ/api/v1/registrations" -H "Authorization: Bearer $USER_TOKEN")
check "A plain user sees only their own rows" true \
    "$(json 'j.content.every(r => r.createdBy === "'"$PLAIN_USER"'")' <<< "$scoped")"

check "Administrator may export"            200 "$(status "$BIZ/api/v1/registrations/export" -H "$AUTH")"
check "Plain user may not export"           403 "$(status -H 'Accept: application/json' "$BIZ/api/v1/registrations/export" -H "Authorization: Bearer $USER_TOKEN")"

csv=$(body "$BIZ/api/v1/registrations/export?provinceCode=VA" -H "$AUTH")
contains "Export has a CSV header row"      'istat_code' "$csv"
contains "Export contains the new record"   "$REF"       "$csv"

check "Statistics report a total"           true "$(json 'typeof j.total === "number"' <<< "$(body "$BIZ/api/v1/registrations/statistics" -H "$AUTH")")"

# ─────────────────────────────────────────────────────────────────────────────
bold "Cross-service trust"

check "Business accepts a token IAM signed"  200 "$(status "$BIZ/api/v1/geo/regions?q=laz" -H "$AUTH")"
check "A forged token is refused"            401 "$(status -H 'Accept: application/json' "$BIZ/api/v1/geo/regions" -H 'Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJmYWtlIn0.invalid')"
check "An IAM refresh token is not an access token" 401 \
    "$(status -H 'Accept: application/json' "$BIZ/api/v1/geo/regions" -H "Authorization: Bearer $ADMIN_REFRESH")"

# ─────────────────────────────────────────────────────────────────────────────
printf '\n\033[1m%s\033[0m\n' "──────────────────────────────────────────────────────────────"
if [[ $failed -eq 0 ]]; then
    printf '  \033[32m%d passed, %d failed\033[0m\n\n' "$passed" "$failed"
else
    printf '  \033[31m%d passed, %d failed\033[0m\n\n' "$passed" "$failed"
fi
exit $((failed > 0 ? 1 : 0))
