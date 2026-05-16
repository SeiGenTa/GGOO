FROM node:20-alpine as base

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# 1. Aseguramos que la carpeta /app pertenezca al usuario 'node' (UID 1000)
RUN chown -R node:node /app

# 2. Cambiamos al usuario 'node' ANTES de instalar cualquier paquete
USER node

# 3. Instalamos pnpm de forma local para el usuario node
RUN npm config set prefix ~/.npm-global && npm install -g pnpm
ENV PATH="/home/node/.npm-global/bin:${PATH}"

# 4. Copiamos los archivos asegurando que el dueño sea el usuario 'node'
COPY --chown=node:node package.json pnpm-lock.yaml ./
COPY --chown=node:node prisma ./prisma/

# 5. La instalación ahora creará todo con los permisos correctos (1000:1000)
RUN pnpm install --frozen-lockfile

# 6. Copiamos el resto del código fuente como el usuario node
COPY --chown=node:node . .

FROM base as development

EXPOSE 5173

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm dev --host 0.0.0.0 --port 5173"]


FROM base as builder

RUN pnpm build

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm build"]


FROM node:20-alpine as production
# En producción también instalamos OpenSSL por si Prisma lo requiere al ejecutar la app
RUN apk add --no-cache openssl

WORKDIR /app
RUN chown -R node:node /app
USER node

COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

CMD ["sh", "-c", "node build --port 5173"]