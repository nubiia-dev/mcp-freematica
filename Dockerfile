# Stage 1: Build
# Instala todas las dependencias (incluyendo devDependencies para la compilación),
# compila TypeScript a dist/, y luego elimina las devDependencies para el stage final.
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar manifests primero para aprovechar la caché de capas de Docker
COPY package*.json tsconfig.json ./
COPY src ./src

# npm ci garantiza instalación reproducible. npm prune elimina devDependencies
# antes de copiar node_modules al runtime stage (reduce tamaño de imagen).
RUN npm ci && npm run build && npm prune --production

# Stage 2: Runtime
# Imagen mínima con solo las dependencias de producción y el código compilado.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Instalar curl para el HEALTHCHECK. wget está disponible en alpine pero
# curl es más compatible con el patrón estándar de healthchecks en Docker.
RUN apk add --no-cache curl

# Copiar solo lo necesario del stage de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Healthcheck: verifica que el endpoint /health responde con 200.
# Solo aplica cuando el servidor está en modo HTTP (MCP_TRANSPORT=http).
# En modo stdio el healthcheck fallará — lo cual es correcto ya que en
# modo stdio el contenedor Docker no es el patrón de uso habitual.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${MCP_PORT:-3000}/health || exit 1

EXPOSE 3000

# Ejecutar como usuario no-root por seguridad.
# El usuario 'node' existe en la imagen node:20-alpine con uid 1000.
USER node

CMD ["node", "dist/index.js"]
