FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

RUN npm ci

COPY apps/users-service ./apps/users-service
COPY libs ./libs

RUN npm run build -- users-service

FROM node:22-alpine AS runtime

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8002

CMD ["node", "dist/apps/users-service/main.js"]