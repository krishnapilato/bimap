# BiMap Frontend

Angular client for registering Italian heritage assets on a map, managing users and exploring places in Street View.

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Signal Forms](https://img.shields.io/badge/Signal_Forms-22-DD0031?logo=angular&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?logo=tailwindcss&logoColor=white)
![daisyUI](https://img.shields.io/badge/daisyUI-5-5A0EF8?logo=daisyui&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-demo-222222?logo=githubpages&logoColor=white)

**Live demo:** [krishnapilato.github.io/bimap](https://krishnapilato.github.io/bimap/)

---

## Pages

| Route | Page | Access |
|---|---|---|
| `/` | Landing page with a fading aerial map of Italy | public |
| `/login` | Sign in and sign up | public |
| `/assets` | Register an asset: place, address, map pin, and the asset register | signed in |
| `/street-view` | Road map with Street View coverage and a live panorama | signed in |
| `/users` | User management: create, edit, enable or disable, delete, welcome email | administrator |

## Running

```bash
npm install
npm start
```

Open <http://localhost:4200>. The app expects the [backend](../backend/README.md) on `http://localhost:8080`.

### Demo mode

```bash
npm run start:demo
```

The demo build needs no backend: an HTTP interceptor answers every API call from in-memory mock data, route guards are off, and you start signed in as an administrator. Comuni-ITA, Nominatim and Google Maps are still called for real. Changes reset on reload.

## Building

| Command | Output |
|---|---|
| `npm run build` | Production build against the real backend |
| `npm run build:demo` | Demo build for GitHub Pages, served from `/bimap/` |

Both write to `dist/frontend/browser`.

## How it is built

- **Standalone components, signals and zoneless change detection** throughout.
- **Signal Forms** (`@angular/forms/signals`) for every form, with validation in the schema.
- **`rxResource`** for loading data, including the region → province → municipality chain.
- **Tailwind CSS and daisyUI** for all styling, with no component stylesheets. The theme lives in `src/tailwind.css`.
- **Functional guards and interceptors**; the JWT is kept in a signal-based `AuthService`.
- **Angular style guide naming**: feature folders and component files without a `.component` suffix.
- **No UI library besides daisyUI**: notifications go through a small `ToastService`.

## External services

| Service | Used for |
|---|---|
| [Comuni-ITA](https://github.com/Samurai016/Comuni-ITA) | Regions, provinces, municipalities and ISTAT codes |
| [Nominatim](https://nominatim.org/) | Turning an address into coordinates |
| Google Maps JavaScript API | Map tiles and Street View |

## Project structure

```
src/app
├── core                 App-wide plumbing
│   ├── auth             AuthService, guards, interceptor and auth models
│   └── demo             Mock data and the interceptor used by the demo build
├── shared               Navbar, aerial map and ToastService
└── features             One folder per page
    ├── home             Landing page
    ├── login            Sign in, sign up and sign out
    ├── assets           Asset registration, its service and models
    ├── street-view      Street View page
    └── users            User management, its service and models
```
