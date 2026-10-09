# ========================================================
# ChangeGuard Multi-Stage Production Container Build
# Compliant with PRD Section 14.6 & Security Hardening
# ========================================================

# --- Stage 1: Build Frontend Assets ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Build Backend Services ---
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# --- Stage 3: Production Minimal Runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy frontend static build assets
COPY --from=frontend-builder /app/dist ./public

# Security: Run as non-root user
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
