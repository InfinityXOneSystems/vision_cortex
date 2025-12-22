# 🧠 VISION CORTEX QUANTUM AI BRAIN - DOCKERFILE
# 
# Containerized deployment for Google Cloud Run
# Central intelligence system that feeds all other services
#
# @author Infinity X One Systems
# @version 2.0.0

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# ============================================================================
# DEPENDENCY INSTALLATION
# ============================================================================

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# ============================================================================
# APPLICATION BUILD
# ============================================================================

FROM base AS builder

# Install dev dependencies for build
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY .env.example ./.env.example

# Build TypeScript
RUN npm run build

# ============================================================================
# PRODUCTION IMAGE
# ============================================================================

FROM node:20-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S visioncortex -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create necessary directories
RUN mkdir -p logs data/cache data/memory && \
    chown -R visioncortex:nodejs /app

# Switch to non-root user
USER visioncortex

# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV LOG_LEVEL=info

# Google Cloud Run optimizations
ENV GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}
ENV GCP_REGION=${GCP_REGION:-us-east1}
ENV VERTEX_AI_REGION=${VERTEX_AI_REGION:-us-east1}

# Inter-service communication
ENV TAXONOMY_SERVICE_URL=${TAXONOMY_SERVICE_URL}
ENV INDEX_SERVICE_URL=${INDEX_SERVICE_URL}
ENV AUTO_BUILDER_SERVICE_URL=${AUTO_BUILDER_SERVICE_URL}
ENV REAL_ESTATE_SERVICE_URL=${REAL_ESTATE_SERVICE_URL}
ENV GATEWAY_SERVICE_URL=${GATEWAY_SERVICE_URL}

# ============================================================================
# STARTUP
# ============================================================================

# Start the quantum intelligence system
CMD ["node", "dist/server.js"]

# Labels for Google Cloud Run
LABEL com.google.cloud.vision-cortex.version="2.0.0"
LABEL com.google.cloud.vision-cortex.description="Quantum AI Brain - Central Intelligence System"
LABEL com.google.cloud.vision-cortex.source="https://github.com/InfinityXOneSystems/vision-cortex"
