# ---- Stage 1: build the React frontend ----
FROM node:20-bullseye-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* frontend/.npmrc* ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY frontend/ ./
# Relative API base ("/api") so the app is same-origin with the backend
ENV REACT_APP_BACKEND_URL=""
ENV CI=false
RUN npm run build

# ---- Stage 2: Python backend that also serves the built frontend ----
FROM python:3.12-slim AS backend
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
COPY backend/requirements-lock.txt ./requirements.txt
RUN pip install -r requirements.txt
COPY backend/ ./backend/
# Bring in the compiled frontend (server.py serves ../frontend/build)
COPY --from=frontend /app/frontend/build ./frontend/build
WORKDIR /app/backend
# Render/most hosts inject $PORT; default to 8000 locally
ENV PORT=8000
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
