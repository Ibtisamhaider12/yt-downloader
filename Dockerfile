# Multi-stage build for YouTube Downloader
FROM node:20-alpine AS base

# Install curl for health checks
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install production dependencies
RUN cd server && npm install --only=production
RUN cd client && npm install --only=production

# Development stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies for building
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build React app
RUN cd client && npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S youtube-downloader -u 1001

# Install curl for health checks
RUN apk add --no-cache curl

# Copy server package files
COPY server/package*.json ./

# Install production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy built React app
COPY --from=builder /app/client/build ./public

# Copy server code
COPY server/ ./

# Create temp directory for ytdl-core with proper permissions
RUN mkdir -p /tmp/ytdl-temp && \
    chown -R youtube-downloader:nodejs /tmp/ytdl-temp && \
    chmod 755 /tmp/ytdl-temp

# Create health check script (uses PORT env var from Railway)
RUN echo '#!/bin/sh\nPORT=${PORT:-5001}\ncurl -f http://localhost:${PORT}/api/health || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# Switch to non-root user
USER youtube-downloader

# Expose port (Railway will use PORT env var, but we expose default for Docker)
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Start the application
CMD ["npm", "start"]
