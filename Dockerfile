# Produktions-Image: API (Node.js) liefert auch das gebaute Frontend aus.
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/website/package.json apps/website/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages packages
COPY apps apps
COPY regelwerk regelwerk
COPY konfiguration konfiguration
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIST=/app/apps/web/dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/assets apps/api/assets
COPY --from=build /app/apps/api/drizzle apps/api/drizzle
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/regelwerk regelwerk
COPY --from=build /app/konfiguration konfiguration
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/gesundheit || exit 1
CMD ["node", "apps/api/dist/server.js"]
