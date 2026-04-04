FROM node:24-bookworm as base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

FROM base as development

EXPOSE 5173

CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev -- --host 0.0.0.0 --port 5173"]

FROM base as builder

RUN npm run build

CMD ["sh", "-c", "npx prisma migrate deploy"]

FROM node:24-bookworm as production
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

CMD ["sh", "-c", "node build --port 5173"]
