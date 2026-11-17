# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

ARG VITE_API_BASE_URL
ARG VITE_USE_MOCKS

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS

COPY . .
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy your custom React Router Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
