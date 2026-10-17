FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups
USER node
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATABASE_URL=file:/app/data/steril-track.sqlite
EXPOSE 3000
CMD ["pnpm","start","--hostname","0.0.0.0"]
