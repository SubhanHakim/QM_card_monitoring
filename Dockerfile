# Step 1: Build React Vite app
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Install dependencies using clean install
RUN npm ci

# Optional: Build argument for backend API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy source code (excluding files listed in .dockerignore)
COPY . .

# Build production bundle (/app/dist)
RUN npm run build

# Step 2: Serve using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration with SPA fallback routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build output to Nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
