# BiMap Backend

REST API for registering Italian heritage assets on a map: sign-in with JWT, user management for administrators, an Italian comuni autocomplete, asset data and form submissions with CSV export.

![Java](https://img.shields.io/badge/Java-27-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-JWT-6DB33F?logo=springsecurity&logoColor=white)
![Spring Data JPA](https://img.shields.io/badge/Spring_Data_JPA-Hibernate-59666C?logo=hibernate&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-26.7-4479A1?logo=mysql&logoColor=white)
![Actuator](https://img.shields.io/badge/Actuator-health_%7C_info-6DB33F?logo=spring&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-springdoc-85EA2D?logo=swagger&logoColor=black)
![Thymeleaf](https://img.shields.io/badge/Thymeleaf-templates-005F0F?logo=thymeleaf&logoColor=white)
![Maven](https://img.shields.io/badge/Maven-3.9-C71A36?logo=apachemaven&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

---

## Quick start with Docker

Requires Docker with Compose.

```bash
cp .env.example .env
docker compose up -d --build
```

Edit `.env` before the first start (see [Configuration](#configuration)). Then open:

| URL | What |
|---|---|
| <http://localhost:8080> | Landing page with live status and links |
| <http://localhost:8080/swagger-ui.html> | Interactive API documentation |
| <http://localhost:8080/actuator/health> | Health check |

The stack has two containers: MySQL with its data in the `mysql-data` volume, and the backend, which starts once MySQL is healthy. With `spring.profiles.active=dev` in `.env`, demo users are created on startup; their password is `12345678` (for example `giulia.rossi@example.com`, administrator).

Stop with `docker compose down`; add `-v` to also delete the database.

## Run locally without Docker

Requires JDK 27 and a MySQL server on `127.0.0.1:3306`.

```bash
cp .env.example .env
./mvnw spring-boot:run
```

The app reads `.env` from the working directory, so run it from this folder (IntelliJ does this by default). It connects as `root` to the `bimap` database and creates it if missing.

## Configuration

All secrets come from the environment. Locally they live in `.env` (git-ignored); in production, set them as real environment variables.

| Variable | Required | Description |
|---|---|---|
| `DB_PASSWORD` | yes | MySQL password |
| `JWT_SECRET` | yes | HS256 signing key for access tokens, at least 32 characters |
| `MAIL_HOST`, `MAIL_PORT` | yes | SMTP server |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | yes | SMTP credentials |
| `MAIL_FROM` | yes | Sender address of outgoing emails |
| `APP_FRONTEND_URL` | no | Allowed CORS origin and link in emails, default `http://localhost:4200` |
| `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` | no | Override the database connection (Docker Compose does) |
| `SERVER_PORT` | no | HTTP port, default `8080` |
| `spring.profiles.active` | no | `dev` seeds demo users; leave unset in production |

Generate a strong JWT secret with `openssl rand -base64 48`.

## API

Every endpoint except sign-in, sign-up and the public pages needs the header `Authorization: Bearer <token>`. Errors follow RFC 9457 (`application/problem+json`); validation errors add an `errors` map of field to message.

| Method and path | Access | Description |
|---|---|---|
| `POST /auth/login` | public | `{ email, password }` → `{ token, user }`, token valid for 10 hours |
| `POST /auth/signup` | public | `{ name, surname, email, password }` → `201` with `{ token, user }`; creates a `USER` account (`409` if the email exists) |
| `GET /places/regions?q=` | signed in | Regions containing `q` (max 4) |
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
| `POST /users/{id}/welcome-email` | administrator | Email the user a link to sign in |

The full contract, with request and response schemas, is in Swagger UI.

## Monitoring

| Endpoint | Shows |
|---|---|
| `/actuator/health` | `UP` / `DOWN`; administrators also see database, mail and disk details |
| `/actuator/health/liveness`, `/actuator/health/readiness` | Probes for Docker and Kubernetes |
| `/actuator/info` | Name, version, description, Java and OS |

No other actuator endpoints are exposed over HTTP. Logs go to the console, ready to be collected by Docker or any log platform.

## Security

- Passwords are stored as BCrypt hashes and never returned by the API.
- Stateless JWT authentication, checked by Spring Security; tokens carry the user's email and role.
- Disabled and locked accounts cannot sign in.
- CSRF protection is off on purpose: the API authenticates only through the `Authorization` header, never with cookies.
- CORS allows only the configured frontend origin.
- The Docker image runs as a non-root user and contains only the application jar.

## Project structure

```
src/main/java/com/example
├── controller   REST endpoints, landing page and error handling
├── core         Security, OpenAPI, mail and dev seed data
├── model        JPA entities
└── repository   Spring Data repositories
src/main/resources
├── templates    landing-page.html and error.html (Thymeleaf)
├── data.sql     Reference data loaded on startup
└── application.properties
```

## Before going to production

- Rotate every secret that was ever committed and set new ones as environment variables.
- Leave `spring.profiles.active` unset, so no demo accounts are created, and create the first administrator.
- Replace `spring.jpa.hibernate.ddl-auto=update` and the startup `data.sql` with versioned migrations (for example Flyway).
- Serve the API over HTTPS behind a reverse proxy and set `APP_FRONTEND_URL` to the real frontend.
- Decide whether Swagger UI stays public (`springdoc.swagger-ui.enabled=false` turns it off).

## Author

**Khova Krishna Pilato** — [github.com/krishnapilato](https://github.com/krishnapilato)
