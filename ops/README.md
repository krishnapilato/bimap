# BiMap — Ops

Small tools for running and checking the stack. None of them ships in an image.

| File | What it is for |
|---|---|
| `mysql/init/01-schemas.sql` | Runs once when the MySQL container starts on an empty volume: creates `bimap_core` next to `bimap_iam` and grants the application user both. Both compose files mount it. |
| `smoke-test.sh` | End-to-end checks against a running stack, including every path that should fail. |
| `json.js` | Reads JSON on stdin and evaluates an expression against it; the smoke test's `jq`, without installing `jq`. |
| `google-signin-test.html` | A bare page that signs in with Google and posts the ID token to the IAM service, to test that flow without the client. |

## Smoke test

```bash
bash ops/smoke-test.sh
```

It needs both services up and `node` on the path. It signs in as the seeded accounts, so start the
stack with a `BIMAP_SEED_PASSWORD` and export the same value before running the script. Point it at
other hosts with `IAM_URL` and `BUSINESS_URL`. It calls the live Comuni-ITA, Nominatim and codiceunivoco.it APIs, so a failure in
the geography section can be theirs rather than ours.

## Google sign-in test page

1. Add `http://localhost:8080` to the OAuth client's authorised JavaScript origins.
2. Serve this folder on that port: `npx --yes http-server ops -p 8080`.
3. Open <http://localhost:8080/google-signin-test.html>.

Port 8080 is also the Docker stack's, so stop the stack first.
