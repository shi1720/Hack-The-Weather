FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build && npx esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --outfile=build/server.mjs && npx esbuild scripts/backup.ts --bundle --platform=node --format=esm --packages=external --outfile=build/backup.mjs

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/app/var/kavu.db
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force && mkdir -p /app/var && chown node:node /app/var
COPY --from=build /app/build/server.mjs ./server.mjs
COPY --from=build /app/build/backup.mjs ./backup.mjs
COPY --from=build /app/dist ./dist
COPY --from=build /app/public/data ./public/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
