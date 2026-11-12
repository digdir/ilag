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

RUN ln -sf /usr/share/zoneinfo/Europe/Oslo /etc/localtime

# The repositories agent-workspace-init clones into /home/agent/code at boot.
COPY workspace.list /etc/agent-workspace.d/ilag.list

RUN agent-image-check

USER agent
