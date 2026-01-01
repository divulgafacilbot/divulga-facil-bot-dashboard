FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --ignore-scripts --include-workspace-root --workspaces

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run --workspace apps/api build

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npm","run","start"]
