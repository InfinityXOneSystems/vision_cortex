# Vision Cortex universal ingestor (24/7 runner)
FROM node:20-bullseye

WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

ENV NODE_ENV=production
CMD ["npx", "ts-node", "src/vision-cortex/universal-ingestor.ts"]
