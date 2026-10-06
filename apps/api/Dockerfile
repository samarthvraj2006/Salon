FROM node:20-alpine AS build
WORKDIR /workspace

COPY package.json ./package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install --workspace=@salonslot/api --workspace=@salonslot/shared

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN npm run build --workspace=@salonslot/shared
RUN npm run db:generate --workspace=@salonslot/api
RUN npm run build --workspace=@salonslot/api
RUN npm prune --omit=dev --workspace=@salonslot/api --workspace=@salonslot/shared

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=build /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /workspace/packages/shared/dist ./packages/shared/dist

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
