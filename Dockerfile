# Dockerfile
FROM node:20-alpine

# Dependencias básicas
RUN apk add --no-cache git bash

# Carpeta de trabajo
WORKDIR /app

# Copiar package.json primero para aprovechar la caché
COPY package*.json ./
RUN npm ci --only=production || npm ci

# Copiar el resto del proyecto
COPY . .

# Instalar PM2 globalmente
RUN npm i -g pm2

# Variables de entorno
ENV NODE_ENV=production

# Comando por defecto (muestra ayuda, se puede overridear con docker run)
CMD ["bash", "-lc", "echo 'Imagen lista. Usa pm2 o node <script>.js para correr procesos.' && pm2 -v && node -v"]
