# BiMap frontend — production image.
#
# Angular builds to static files, so the runtime is nginx with no Node in it at all. The image is
# a few megabytes and has no npm, no toolchain and nothing to patch on a CVE Tuesday.
#
# Author: Khova Krishna Pilato

ARG NODE_VERSION=24
ARG NGINX_VERSION=1.29

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /build

# The lockfile changes far less often than the source, so dependencies cache on their own layer.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY angular.json tsconfig*.json .postcssrc.json ./
COPY src ./src

# `live` points at the reverse proxy in front of the two services; `demo` is the static
# GitHub Pages build with no backend at all.
ARG BUILD_CONFIGURATION=production
RUN npm run ng -- build --configuration ${BUILD_CONFIGURATION}

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM nginx:${NGINX_VERSION}-alpine AS runtime

LABEL org.opencontainers.image.title="BiMap Frontend" \
      org.opencontainers.image.description="Angular client for the BiMap platform" \
      org.opencontainers.image.authors="Khova Krishna Pilato <krishnak.pilato@gmail.com>" \
      org.opencontainers.image.source="https://github.com/krishnapilato/bimap"

COPY --from=build /build/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx:alpine already runs unprivileged as `nginx`; it only needs to own what it writes.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx \
 && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
