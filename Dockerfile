# syntax=docker/dockerfile:1

# Bun, not Node: the app uses `bun:sqlite` and @opentui/core loads a native
# Zig library through Bun's FFI. Debian (glibc) rather than Alpine, because
# OpenTUI's musl builds are far less exercised than its glibc ones.
FROM oven/bun:1-debian

# TERM/COLORTERM: without them the TUI loses colours and box-drawing glyphs.
# XDG_CONFIG_HOME: `conf` resolves its store through env-paths, which honours
# this on Linux, so the API keys set via /config land in one mountable
# directory instead of a buried ~/.config path.
ENV TERM=xterm-256color \
    COLORTERM=truecolor \
    XDG_CONFIG_HOME=/config

WORKDIR /app

# Manifests first, so the dependency layer is cached and editing a component
# doesn't re-resolve every package. --production skips the vitest toolchain
# (rolldown/lightningcss native binaries) that the app never loads at runtime.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Run straight from TypeScript. `bun run build` (plain tsc) is not an option:
# it leaves `import { Database } from 'bun:sqlite'` in dist/, which only Bun
# can resolve, and bin/cli.js calls a run() export src/index.tsx never has.
COPY tsconfig.json ./
COPY src ./src

# The only two paths the app writes to. src/db/connection.ts resolves the DB
# from import.meta.url, so /app/src/db/../../db => /app/db.
RUN mkdir -p /app/db /config
VOLUME ["/app/db", "/config"]

# No EXPOSE: there is no server here, only outbound HTTPS to the AI vendors.
CMD ["bun", "src/index.tsx"]
