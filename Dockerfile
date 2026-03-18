FROM node:20-slim AS frontend-build
WORKDIR /build
COPY website-react/package.json ./
RUN yarn install
COPY website-react/ ./
RUN VITE_BASE_PATH=/ yarn build

FROM node:20-slim AS webapp-build
WORKDIR /build
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile 2>/dev/null || yarn install
COPY frontend/ ./
ENV EXPO_PUBLIC_BACKEND_URL=https://sijillproject.com
RUN npx expo export --platform web

FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

COPY backend/ ./backend/
COPY --from=frontend-build /build/dist/ ./website-react/dist/
COPY --from=webapp-build /build/dist/ ./webapp/dist/

WORKDIR /app/backend

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
