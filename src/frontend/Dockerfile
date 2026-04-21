# Build stage
FROM node:20-alpine AS build
WORKDIR /web
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# For Vite/CRA, ensure API base points to /api (reverse-proxied by nginx)
# e.g., VITE_API_BASE=/api
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist /usr/share/nginx/html
# create logs dir for container (frontend does not write logs to disk normally)
RUN mkdir -p /var/log/frontend
EXPOSE 80
