# BiMap

A web application for registering Italian heritage assets on a map: pick a place, check it in Street View, save its details. Administrators manage who can use it.

![Java](https://img.shields.io/badge/Java-27-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-26.7-4479A1?logo=mysql&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?logo=tailwindcss&logoColor=white)
![daisyUI](https://img.shields.io/badge/daisyUI-5-5A0EF8?logo=daisyui&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

**Live demo:** [krishnapilato.github.io/bimap](https://krishnapilato.github.io/bimap/) — runs entirely in the browser with mock data, no sign-in needed.

---

## Screenshots

### Frontend

| Landing page | Sign in |
|---|---|
| ![Landing page](docs/screenshots/frontend-home.png) | ![Sign in](docs/screenshots/frontend-login.png) |

| Register an asset | Street View |
|---|---|
| ![Register an asset](docs/screenshots/frontend-assets.png) | ![Street View](docs/screenshots/frontend-street-view.png) |

| Users | Edit a user |
|---|---|
| ![Users](docs/screenshots/frontend-users.png) | ![Edit a user](docs/screenshots/frontend-users-edit.png) |

### Backend

| Landing page | API documentation |
|---|---|
| ![Backend landing page](docs/screenshots/backend-landing.png) | ![Swagger UI](docs/screenshots/backend-swagger.png) |

## Architecture

```
Browser ──▶ Angular frontend (port 4200) ──▶ Spring Boot API (port 8080) ──▶ MySQL
                │                                  │
                │                                  └──▶ SMTP server (emails)
                ├──▶ Comuni-ITA API (regions, provinces, municipalities, ISTAT codes)
                ├──▶ Nominatim (address lookup)
                └──▶ Google Maps (tiles and Street View)
```

- **Frontend** — Angular 22 single-page app styled with Tailwind CSS and daisyUI, with a Leaflet map and Google Street View.
- **Backend** — stateless REST API secured with JWT, documented with OpenAPI.
- **Database** — MySQL, holding users, saved forms and the asset register.

## Repository

| Folder | What is in it |
|---|---|
| [`backend/`](backend/README.md) | The REST API, security and Docker setup. |
| [`frontend/`](frontend/README.md) | The Angular client, including the demo build for GitHub Pages. |

## Getting started

### 1. Backend and database (Docker)

```bash
cd backend
cp .env.example .env
docker compose up -d --build
```

Fill in `.env` first. The API then runs on <http://localhost:8080>, with interactive documentation at <http://localhost:8080/swagger-ui.html>. See the [backend README](backend/README.md) for configuration, the API reference and running without Docker.

### 2. Frontend

Requires Node.js and npm.

```bash
cd frontend
npm install
npm start
```

Open <http://localhost:4200>. The frontend talks to the API at `http://localhost:8080`, set in `frontend/src/environments/`.

With the `dev` profile enabled in `.env`, the backend creates demo accounts with the password `12345678`, for example `giulia.rossi@example.com` (administrator) and `marco.bianchi@example.com` (user).

To try the frontend without any backend, run `npm run start:demo` instead.

## Deployment

Every push to `main` builds the demo and publishes it to GitHub Pages through [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

## Author

**Khova Krishna Pilato** — [github.com/krishnapilato](https://github.com/krishnapilato)
