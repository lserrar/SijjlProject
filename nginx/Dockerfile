FROM node:20-slim AS webapp-build
WORKDIR /build
COPY frontend/package.json ./
RUN yarn install || true
COPY frontend/ ./
ENV EXPO_PUBLIC_BACKEND_URL=https://app.sijillproject.com
RUN npx expo export --platform web

FROM nginx:alpine
COPY --from=webapp-build /build/dist/ /usr/share/nginx/webapp/
