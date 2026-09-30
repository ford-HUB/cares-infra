# Installs use pnpm from pnpm-lock.yaml, the lockfile the project actually maintains.
# package-lock.json is stale and is not used by any stage.
ARG PNPM_VERSION=10.33.0

# Development Stage
FROM node:22-alpine AS development
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Ginagamit ang start:dev para sa auto-reload
CMD ["pnpm", "run", "start:dev"]

# Production Build Stage
FROM node:22-alpine AS builder
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Full install: the Nest CLI, TypeScript and Prisma are dev dependencies the build needs.
RUN pnpm install --frozen-lockfile
COPY . .
# The generated Prisma client is not committed. generate never connects, but
# prisma.config.ts requires DATABASE_URL to be set, so a placeholder is enough.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm run prisma:generate
RUN pnpm run build

# Production Stage
FROM node:22-alpine AS production
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /usr/src/app
# Default to production so the mailer and CORS pick their production branch even if
# the platform forgets to set it; an explicit NODE_ENV still wins.
ENV NODE_ENV=production
# BusyBox ps has no --sort; the host metrics sampler needs the procps one.
RUN apk add --no-cache procps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Fresh runtime-only install rather than pruning the builder's modules.
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /usr/src/app/dist ./dist
CMD ["node", "dist/main"]
