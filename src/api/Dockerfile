FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src
# Ensure logs directory exists and has correct permissions
RUN mkdir -p /app/logs && chown -R node:node /app/logs
ENV LOG_DIR=/app/logs
EXPOSE 8080
CMD ["node", "src/server.js"]
