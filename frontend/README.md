# BiMap — Frontend

The Angular client: a full-screen map with Street View at its core, and the working screens around
it for surveyors, reviewers and administrators.

**Angular 22 (zoneless, signals, Signal Forms) · TanStack Query · Leaflet · Google Maps JavaScript API ·
GSAP · uPlot · PapaParse · Lucide · Vitest**

---

## Running it

| Command | What it does |
|---|---|
| `npm start` | Dev server on <http://localhost:4200>, proxying `/iam` and `/core` to services on `:9843` and `:9844` ([`proxy.conf.json`](proxy.conf.json)). |
| `npm run start:demo` | The demo: no backend at all, an in-browser one with sample data. |
| `npm test -- --watch=false` | Unit tests with Vitest. |
| `npm run build` | Production bundle in `dist/frontend/browser`, talking to `/iam` and `/core` on its own origin. |
| `npm run build:demo` | The static demo, as GitHub Pages serves it. |
| `docker build -t bimap/frontend .` | nginx image serving the bundle and proxying both services; see [`nginx.conf`](nginx.conf). |

---

## Live or demo

The two builds are the same application with one flag, `demo`, in `src/environments/`:

| | `environment.production.ts` | `environment.demo.ts` |
|---|---|---|
| API | the real services, through `/iam` and `/core` | an HTTP interceptor answers every call in the browser |
| Session | sign in with a password or Google | signed in as an administrator on arrival |
| Data | MySQL | seeded, kept in local storage until **Reset demo data** |
| Maps and Street View | real | real |

`main.ts` loads the demo backend with a dynamic import only when `demo` is true, so the live bundle
never contains it. To point a build at a backend somewhere else, change `api` in its environment
file. The demo's user menu can switch role (surveyor, manager, administrator), preview the sign-in
screen, and reset its data.

The demo is deployed to GitHub Pages by [`.github/workflows/frontend-pages.yml`](../.github/workflows/frontend-pages.yml)
on every push to `main`.

---

## Where things are

```
src/app
├── core/        App-wide services with no UI
│   ├── api/       One typed client per backend area, and the models they exchange
│   ├── auth/      Session, token refresh, guards, Google Identity, sign-in and sign-out flows
│   ├── query/     The TanStack Query client and every query key
│   └── ui/        Preferences, motion, viewport, formatting, haptics, keyboard shortcuts, full screen
├── ui/          The design system: buttons, fields, lookups, tables, tabs, dialogs, sheets, charts, icons
├── shared/
│   ├── map/       The map and Street View canvas, Leaflet and Google Maps glue, geometry
│   └── mail/      Email rendering and the sandboxed preview frame
├── layout/      The shell (navigation, top bar, bottom bar), the sign-in layout, the command palette
├── features/    One folder per screen
│   ├── auth/            Sign in, sign up, activation, password recovery
│   ├── home/            What needs attention today
│   ├── survey/          Registering an asset on the map
│   ├── registry/        Registrations as a table, cards or a map, and each one's page
│   ├── geography/       Italy from region to comune, with codes, streets and public bodies
│   ├── people/          Accounts and their lifecycle
│   ├── mail/            The delivery log, the message reader and the composer
│   ├── audiences/       Mailing lists, subscribers, CSV import, campaigns and their reports
│   ├── health/          Both services live from Actuator
│   ├── account/         Your profile, permissions, password and this device's preferences
│   └── subscriptions/   Public pages for signing up to and leaving a list
└── demo/        The in-browser backend: routes, handlers and seeded data
```

Conventions: standalone components, signals for state, `OnPush` everywhere, server state only in
TanStack Query, forms with Signal Forms, and every route loaded lazily.

---

## The map

The survey, the registry and the geography explorer share one canvas, `shared/map/geo-canvas.ts`:
a Leaflet map on Google tiles, Street View beside it or instead of it, a camera cone that follows
the panorama, a context menu, geolocation and full screen. Street View cannot be squeezed to zero
width without losing its imagery, so in the single modes the hidden pane stays full size underneath.

The Google Maps key is in the environment files. It is public by design: restrict it by HTTP
referrer to the origins that serve the app. Google sign-in needs the same origins in the OAuth
client's authorised JavaScript origins.

---

## Design system

- **Light only**, on tokens in `src/styles/_tokens.scss`: cobalt for anything you can act on, amber
  for position and nothing else, and SAP's semantic set for states, always with a word or an icon.
- **Manrope** for text and **JetBrains Mono** for everything measured: codes, coordinates, counts.
- **Motion** comes from CSS keyframes, view transitions between routes, and GSAP for scripted
  moments. Every movement is multiplied by `--bm-motion`, so reduced motion keeps the fades and
  drops the travel. The account page's **Motion** setting overrides the device: *Like the device*,
  *Full* or *Reduced*.
- **Touch**: ripples where a finger lands, gentle haptics for moments that matter, 44 px targets,
  bottom sheets instead of side panels on phones.
- **Icons** are [Lucide](https://lucide.dev), drawn by `ui/icon/icon.ts` from the set registered in
  `ui/icon/icon-set.ts`. Only registered icons reach the bundle: a new icon goes in that file.

---

## Security in the client

- Access tokens live in memory and storage chosen by *Keep me signed in*; a signed-out tab signs out
  every tab.
- Email bodies render in an iframe sandboxed without scripts.
- nginx sends `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
  and a Content Security Policy in report-only mode, ready to enforce once watched against real
  Google traffic. HTTPS is terminated in front of nginx, not by it.

---

## Tests

Unit tests sit next to the code as `*.spec.ts` and run on Vitest with jsdom: email rendering and
merge tags, formatting, geometry, the survey form mapping, the demo backend's paging and CSV
escaping, keyboard shortcuts and audience presentation. CI runs them before every build.
