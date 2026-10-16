# BiMap

A web application for registering Italian heritage assets on a map: pick a place, check it in Street View, save its details. Administrators manage who can use it.

![Java](https://img.shields.io/badge/Java-27-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-26.7-4479A1?logo=mysql&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Angular Material](https://img.shields.io/badge/Angular_Material-22-757575?logo=materialdesign&logoColor=white)
![OpenLayers](https://img.shields.io/badge/OpenLayers-10-1F6B75?logo=openlayers&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

**Frontend:** [krishnapilato.github.io/bimap](https://krishnapilato.github.io/bimap/)

---

## Architecture

```
Browser ──▶ Angular frontend (port 4200) ──▶ Spring Boot API (port 8080) ──▶ MySQL
                                                 │
                                                 └──▶ SMTP server (emails)
```

- **Frontend** — Angular single-page app with an OpenLayers map and Street View.
- **Backend** — stateless REST API secured with JWT, documented with OpenAPI.
- **Database** — MySQL, holding users, saved forms, the asset register and the list of Italian comuni.

## Repository

| Folder | What is in it |
|---|---|
| [`spring-boot/`](spring-boot/README.md) | The backend: REST API, security, Docker setup. Full documentation in its README. |
| `frontend/` | The Angular 22 client. |
| `angular/` | The first version of the client (Angular 14), kept for reference. |

## Getting started

### 1. Backend and database (Docker)

```bash
cd spring-boot
cp .env.example .env
docker compose up -d --build
```

Fill in `.env` first. The API then runs on <http://localhost:8080>, with interactive documentation at <http://localhost:8080/swagger-ui.html>. See the [backend README](spring-boot/README.md) for configuration, the API reference and running without Docker.

### 2. Frontend

Requires Node.js and npm.

```bash
cd frontend
npm install
npm start
```

Open <http://localhost:4200>. The frontend talks to the API at `http://localhost:8080`, set in `frontend/src/environments/`.

With the `dev` profile enabled in `.env`, the backend creates demo accounts with the password `12345678`, for example `giulia.rossi@example.com` (administrator) and `marco.bianchi@example.com` (user).

## Status

The backend has been rebuilt for production: JWT security, input validation, standard error responses, health checks and containers. The frontend is being updated to the new API endpoints.

## Author

**Khova Krishna Pilato** — [github.com/krishnapilato](https://github.com/krishnapilato)
