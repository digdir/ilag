# The ilag Agent's image: the agentctl base image (Ubuntu 26.04, systemd, Node 24, Claude Code, Codex, gh) plus what
# the repository's own scripts need. Pinned to the base image of agentctl v0.1.0-preview.14, the release this definition
# is written for; move to a later release by changing the tag and its digest, as `agentctl update` does.
FROM ghcr.io/digdir/agentctl-base:ubuntu-26.04-v0.1.0-preview.14@sha256:4de3acc36600c2fba8e7e73c0de0ca812cbd32ae2286f1d7750f5394d5e90e72

# The base ends as the unprivileged Agent user; installing packages needs root again.
USER root

# The containers feature adds Podman, the `docker` command and Docker Compose, so `pnpm db:up` starts the same
# PostgreSQL from docker-compose.yml as on a developer's machine. agentd sets up Podman's socket for the agent user
# and resolves short image names such as `postgres:17-alpine` on Docker Hub, as Docker does.
RUN agent-feature install containers

# The desktop feature, with the browser feature it requires: an X11 desktop on display :1 with a VNC server and a noVNC
# viewer, the `desktop` helper for screenshots, input and recordings, and Chromium with playwright-cli. Its VNC units
# stay off until agent.yaml declares `access: [{type: vnc}]`, which lets the developer watch and share the desktop.
RUN agent-feature install desktop

ARG PNPM_VERSION=12.11.2

# Agent Sandboxes mount their CA bundle here; this step's Node downloads trust it. HOME is /home/agent in every stage,
# so npm and pnpm run with a scratch home that is removed afterwards, leaving no root-owned cache there.
RUN if [ -r /run/agent/tls/ca-bundle.pem ]; then \
      export NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem; \
    fi; \
    scratch="$(mktemp -d)" \
    && HOME="${scratch}" npm install --global --allow-scripts=pnpm "pnpm@${PNPM_VERSION}" \
    && HOME="${scratch}" TMPDIR="${scratch}" pnpm --version \
    && rm -rf "${scratch}" /tmp/node-compile-cache

# The system libraries Playwright's Chromium needs for `pnpm test:e2e`, as CI installs them with `--with-deps`.
# Without them the browser fails to start (libnspr4.so missing). Only the libraries: the agent installs the browser
# per checkout with `pnpm --filter cms exec playwright install chromium`, into PLAYWRIGHT_BROWSERS_PATH below, which the
# browser feature shares with its own pinned Chromium.
# Keep the version in step with @playwright/test in src/cms/package.json.
ARG PLAYWRIGHT_VERSION=1.64.1
RUN if [ -r /run/agent/tls/ca-bundle.pem ]; then \
      export NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem; \
    fi; \
    scratch="$(mktemp -d)" \
    && HOME="${scratch}" npm_config_cache="${scratch}/npm" \
       npx --yes "playwright@${PLAYWRIGHT_VERSION}" install-deps chromium \
    && rm -rf "${scratch}" /tmp/node-compile-cache /var/lib/apt/lists/*

# `pnpm dev:stop` (scripts/dev-stop.sh) finds the CMS by its port with lsof. Without it, the CMS keeps running.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends lsof \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/share/zoneinfo/Europe/Oslo /etc/localtime

# The repositories agent-workspace-init clones into /home/agent/code at boot.
COPY workspace.list /etc/agent-workspace.d/ilag.list

RUN agent-image-check

USER agent

# What the browser and desktop features need set, as `agent-feature env browser desktop` prints it.
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
ENV DISPLAY=:1
ENV DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
ENV ACCESSIBILITY_ENABLED=1
ENV PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/local/libexec/agent-playwright-chromium
ENV XDG_CURRENT_DESKTOP=X-Openbox:XFCE
