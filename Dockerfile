FROM node:20-alpine as base

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY . .

FROM base as development

EXPOSE 5173

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm dev --host 0.0.0.0 --port 5173"]

FROM base as builder

RUN pnpm build

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm build"]

FROM node:20-alpine as production
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

CMD ["sh", "-c", "node build --port 5173"]
