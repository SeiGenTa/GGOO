# ==========================================
# 1. ETAPA BASE (Instalación limpia de pnpm y dependencias)
# ==========================================
FROM node:24-alpine as base

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app
RUN chown -R node:node /app
USER node

RUN npm config set prefix ~/.npm-global && npm install -g pnpm
ENV PATH="/home/node/.npm-global/bin:${PATH}"

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

RUN pnpm svelte-kit sync || echo 'Sync completado'
# ==========================================
# 2. ETAPA DE DESARROLLO
# ==========================================
FROM base as development
EXPOSE 5173
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm dev --host 0.0.0.0 --port 5173"]

# ==========================================
# 3. ETAPA DE CONSTRUCCIÓN (Builder)
# ==========================================
FROM base as builder
RUN pnpm build
# Limpiar node_modules para dejar SOLO las dependencias de producción (reduce tamaño de imagen)
RUN pnpm prune --prod

# ==========================================
# 4. ETAPA DE PRODUCCIÓN (Imagen final ultra ligera)
# ==========================================
FROM node:24-alpine as production

RUN apk add --no-cache openssl
RUN apk add --no-cache curl

WORKDIR /app
RUN chown -R node:node /app
USER node

COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma

EXPOSE 5173

CMD ["sh", "-c", "node build --port 5173"]