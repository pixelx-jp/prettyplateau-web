# Build the static SPA, then serve it from nginx. VITE_API_BASE (the
# render-service origin) is baked at build time — pass it as a build arg.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE=""
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Cloud Run sends traffic to $PORT (default 8080); nginx.conf listens on 8080.
EXPOSE 8080
